// Credentials loaded from config.js (included before this script in admin.html)
function showStartupError(msg) {
  const el = document.getElementById('startup-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else { alert(msg); }
}

if (!window.supabase) {
  showStartupError('ERROR: Supabase SDK failed to load. Check your internet connection and refresh the page.');
  throw new Error('Supabase SDK not loaded');
}
if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('PASTE')) {
  showStartupError('ERROR: Supabase credentials not set in config.js.');
  throw new Error('Supabase credentials missing');
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// STATE
// ============================================================
let editingId = null;       // uuid of item being edited, or null in add mode
let currentImageUrls = [];  // array of image URLs for the item currently in the form
let uploading = false;      // true while a photo upload is in progress

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadInventory();
  setupForm();
  setupUpload();
});

// ============================================================
// INVENTORY LIST
// ============================================================
async function loadInventory() {
  const listEl = document.getElementById('inventory-list');
  listEl.innerHTML = '<div class="list-loading">Loading inventory...</div>';

  const { data, error } = await sb
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = '<div class="list-loading">Failed to load inventory. Check your Supabase credentials in config.js.</div>';
    return;
  }

  document.getElementById('list-count').textContent = `${data.length} item${data.length !== 1 ? 's' : ''}`;
  renderList(data);
}

function renderList(items) {
  const listEl = document.getElementById('inventory-list');

  if (items.length === 0) {
    listEl.innerHTML = '<div class="empty-list">No items yet. Add your first item above.</div>';
    return;
  }

  const rows = items.map(item => `
    <tr class="${item.active ? '' : 'inactive'}" data-id="${item.id}">
      <td>
        ${(() => { const urls = parseImageUrls(item.image_url); return urls.length
          ? `<img class="thumb" src="${escAttr(urls[0])}" alt="">`
          : `<div class="no-thumb">No photo</div>`; })()}
      </td>
      <td>${escHTML(item.name)}</td>
      <td>${escHTML(item.category)}</td>
      <td>${escHTML(item.thickness)}</td>
      <td>
        ${item.badge ? `<span class="badge-pill ${item.badge.toLowerCase()}">${escHTML(item.badge)}</span>` : '—'}
      </td>
      <td>
        <span class="status-dot ${item.active ? 'active' : 'inactive'}"></span>
        ${item.active ? 'Visible' : 'Hidden'}
      </td>
      <td>
        <button class="btn-edit" onclick="startEdit('${item.id}')">Edit</button>
        <button class="btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
      </td>
    </tr>
  `).join('');

  listEl.innerHTML = `
    <table class="item-table">
      <thead>
        <tr>
          <th>Photo</th>
          <th>Name</th>
          <th>Category</th>
          <th>Thickness</th>
          <th>Badge</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ============================================================
// PHOTO UPLOAD
// ============================================================
function setupUpload() {
  const input = document.getElementById('photo-input');
  input.addEventListener('change', async () => {
    if (!input.files.length) return;
    for (const file of input.files) {
      await uploadPhoto(file);
    }
    input.value = '';
  });
}

async function uploadPhoto(file) {
  if (uploading) return;
  uploading = true;

  const spinner = document.getElementById('upload-spinner');
  spinner.style.display = 'block';
  clearMessages();

  // Convert non-standard formats (HEIC, TIFF, etc.) to JPEG server-side
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    try {
      // 1. Upload the raw HEIC to Supabase Storage as a temp file
      const tempName = `tmp-${crypto.randomUUID()}.${ext}`;
      const { error: tmpErr } = await sb.storage
        .from('product-images')
        .upload(tempName, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (tmpErr) throw new Error('Could not upload temp file: ' + tmpErr.message);

      const { data: tmpUrl } = sb.storage.from('product-images').getPublicUrl(tempName);

      // 2. Call the convert function with the storage URL (tiny JSON body, no 413)
      const resp = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageUrl: tmpUrl.publicUrl }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        let msg = 'Server conversion failed';
        try { msg = JSON.parse(text).error || msg; } catch(e) { msg = text.slice(0, 200) || msg; }
        throw new Error(msg);
      }
      const blob = await resp.blob();
      file = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });

      // 3. Clean up the temp HEIC file from storage
      await sb.storage.from('product-images').remove([tempName]);
    } catch (e) {
      uploading = false;
      spinner.style.display = 'none';
      showError(`Could not convert image: ${e.message}`);
      return;
    }
  }

  const uploadExt = file.name.split('.').pop().toLowerCase();
  const filename = `${crypto.randomUUID()}.${uploadExt}`;

  let uploadError;
  try {
    const { error } = await sb.storage
      .from('product-images')
      .upload(filename, file, { contentType: file.type, upsert: false });
    uploadError = error;
  } catch (e) {
    uploadError = e;
  }

  uploading = false;
  spinner.style.display = 'none';

  if (uploadError) {
    showError(`Photo upload failed: ${uploadError.message || 'Check your Supabase storage policies.'}`);
    return;
  }

  const { data: urlData } = sb.storage
    .from('product-images')
    .getPublicUrl(filename);

  currentImageUrls.push(urlData.publicUrl);
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  container.innerHTML = currentImageUrls.map((url, i) => `
    <div class="photo-thumb">
      <img src="${escAttr(url)}" alt="">
      <button class="remove-photo" onclick="removePhoto(${i})" title="Remove">&times;</button>
    </div>
  `).join('');
}

async function removePhoto(index) {
  const url = currentImageUrls[index];
  await deleteStorageImage(url);
  currentImageUrls.splice(index, 1);
  renderPhotoPreviews();
}

// Extract storage path from full public URL.
// Returns null if imageUrl is falsy or doesn't contain /product-images/.
function getStoragePath(imageUrl) {
  if (!imageUrl) return null;
  const marker = '/product-images/';
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}

// Returns true if deletion succeeded (or nothing to delete), false on error.
async function deleteStorageImage(imageUrl) {
  const path = getStoragePath(imageUrl);
  if (!path) return true;
  const { error } = await sb.storage.from('product-images').remove([path]);
  return !error;
}

// ============================================================
// FORM
// ============================================================
function setupForm() {
  document.getElementById('btn-save').addEventListener('click', saveItem);
  document.getElementById('btn-cancel').addEventListener('click', cancelEdit);
}

function getFormData() {
  return {
    category: document.getElementById('f-category').value.trim(),
    thickness: document.getElementById('f-thickness').value.trim(),
    name: document.getElementById('f-name').value.trim(),
    color: document.getElementById('f-color').value.trim(),
    quantity: document.getElementById('f-quantity').value.trim(),
    badge: document.getElementById('f-badge').value,
    notes: document.getElementById('f-notes').value.trim() || null,
    image_url: currentImageUrls.length ? JSON.stringify(currentImageUrls) : null,
    active: document.getElementById('f-active').checked,
  };
}

function resetForm() {
  document.getElementById('f-category').value = '';
  document.getElementById('f-thickness').value = '';
  document.getElementById('f-name').value = '';
  document.getElementById('f-color').value = '';
  document.getElementById('f-quantity').value = '';
  document.getElementById('f-badge').value = '';
  document.getElementById('f-notes').value = '';
  document.getElementById('f-active').checked = true;
  document.getElementById('photo-previews').innerHTML = '';
  document.getElementById('photo-input').value = '';
  currentImageUrls = [];
  editingId = null;
  document.getElementById('form-title').textContent = 'Add New Item';
  document.getElementById('btn-cancel').style.display = 'none';
  clearMessages();
}

function cancelEdit() {
  resetForm();
}

async function saveItem() {
  clearMessages();
  const data = getFormData();

  // No required fields — all inputs are optional

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  let error;

  if (editingId) {
    ({ error } = await sb.from('inventory').update(data).eq('id', editingId));
  } else {
    ({ error } = await sb.from('inventory').insert(data));
  }

  btn.disabled = false;
  btn.textContent = 'Save Item';

  if (error) {
    showError('Save failed. Check your connection and try again.');
    return;
  }

  showSuccess(editingId ? 'Item updated.' : 'Item added.');
  resetForm();
  loadInventory();
}

async function startEdit(id) {
  clearMessages();

  const { data, error } = await sb
    .from('inventory')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) { showError('Could not load item. Try again.'); return; }

  editingId = id;
  currentImageUrls = parseImageUrls(data.image_url);

  document.getElementById('f-category').value = data.category;
  document.getElementById('f-thickness').value = data.thickness;
  document.getElementById('f-name').value = data.name;
  document.getElementById('f-color').value = data.color || '';
  document.getElementById('f-quantity').value = data.quantity || '';
  document.getElementById('f-badge').value = data.badge || '';
  document.getElementById('f-notes').value = data.notes || '';
  document.getElementById('f-active').checked = data.active;

  renderPhotoPreviews();

  document.getElementById('form-title').textContent = 'Edit Item';
  document.getElementById('btn-cancel').style.display = 'inline-block';
  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
}

async function deleteItem(id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;

  // Fetch the item first to get image URLs
  const { data: item } = await sb.from('inventory').select('image_url').eq('id', id).single();
  if (item) {
    const urls = parseImageUrls(item.image_url);
    for (const url of urls) {
      await deleteStorageImage(url);
    }
  }

  const { error } = await sb.from('inventory').delete().eq('id', id);
  if (error) {
    showError('Delete failed. The photo was removed but the item record remains — try again.');
    return;
  }

  loadInventory();
}

// ============================================================
// MESSAGES
// ============================================================
function showError(msg) {
  document.getElementById('form-error').textContent = msg;
  document.getElementById('form-success').textContent = '';
}

function showSuccess(msg) {
  document.getElementById('form-success').textContent = msg;
  document.getElementById('form-error').textContent = '';
}

function clearMessages() {
  document.getElementById('form-error').textContent = '';
  document.getElementById('form-success').textContent = '';
}

// ============================================================
// HELPERS
// ============================================================
function escHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}


// Parse image_url field — handles JSON array string, plain URL, or null
function parseImageUrls(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { /* not JSON */ }
  return [value]; // single URL string (backward compat)
}
