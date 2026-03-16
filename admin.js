// Credentials loaded from config.js (included before this script in admin.html)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// STATE
// ============================================================
let editingId = null;       // uuid of item being edited, or null in add mode
let currentImageUrl = null; // image_url for the item currently in the form
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

  const { data, error } = await supabase
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
        ${item.image_url
          ? `<img class="thumb" src="${escAttr(item.image_url)}" alt="">`
          : `<div class="no-thumb">No photo</div>`}
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
        <button class="btn-delete" onclick="deleteItem('${item.id}', ${JSON.stringify(item.image_url || '')})">Delete</button>
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
  const area = document.getElementById('upload-area');
  const input = document.getElementById('photo-input');

  input.addEventListener('change', () => {
    if (input.files[0]) uploadPhoto(input.files[0]);
  });

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('drag-over');
  });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) uploadPhoto(file);
  });
}

async function uploadPhoto(file) {
  if (uploading) return;
  uploading = true;

  const prompt = document.getElementById('upload-prompt');
  const spinner = document.getElementById('upload-spinner');
  const preview = document.getElementById('upload-preview');

  prompt.style.display = 'none';
  spinner.style.display = 'block';
  preview.style.display = 'none';
  clearMessages();

  const ext = file.name.split('.').pop().toLowerCase();
  const filename = `${crypto.randomUUID()}.${ext}`;

  let uploadError;
  try {
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filename, file, { contentType: file.type, upsert: false });
    uploadError = error;
  } catch (e) {
    uploadError = e;
  }

  uploading = false;
  spinner.style.display = 'none';

  if (uploadError) {
    prompt.style.display = 'block';
    showError(`Photo upload failed: ${uploadError.message || 'Check your Supabase storage policies.'}`);
    return;
  }

  // New upload succeeded — delete old image (best-effort, non-blocking)
  if (currentImageUrl) {
    await deleteStorageImage(currentImageUrl);
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filename);

  currentImageUrl = urlData.publicUrl;
  preview.src = currentImageUrl;
  preview.style.display = 'block';
  prompt.style.display = 'none';
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
  const { error } = await supabase.storage.from('product-images').remove([path]);
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
    image_url: currentImageUrl || null,
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
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-prompt').style.display = 'block';
  document.getElementById('photo-input').value = '';
  currentImageUrl = null;
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

  // Validation
  if (!data.category) { showError('Please select a category.'); return; }
  if (!data.thickness) { showError('Please enter a thickness.'); return; }
  if (!data.name) { showError('Please enter a product name.'); return; }

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  let error;

  if (editingId) {
    ({ error } = await supabase.from('inventory').update(data).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('inventory').insert(data));
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

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) { showError('Could not load item. Try again.'); return; }

  editingId = id;
  currentImageUrl = data.image_url || null;

  document.getElementById('f-category').value = data.category;
  document.getElementById('f-thickness').value = data.thickness;
  document.getElementById('f-name').value = data.name;
  document.getElementById('f-color').value = data.color || '';
  document.getElementById('f-quantity').value = data.quantity || '';
  document.getElementById('f-badge').value = data.badge || '';
  document.getElementById('f-notes').value = data.notes || '';
  document.getElementById('f-active').checked = data.active;

  const preview = document.getElementById('upload-preview');
  const prompt = document.getElementById('upload-prompt');
  if (currentImageUrl) {
    preview.src = currentImageUrl;
    preview.style.display = 'block';
    prompt.style.display = 'none';
  } else {
    preview.style.display = 'none';
    prompt.style.display = 'block';
  }

  document.getElementById('form-title').textContent = 'Edit Item';
  document.getElementById('btn-cancel').style.display = 'inline-block';
  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
}

async function deleteItem(id, imageUrl) {
  if (!confirm('Delete this item? This cannot be undone.')) return;

  if (imageUrl) {
    const storageOk = await deleteStorageImage(imageUrl);
    if (!storageOk) {
      showError('Could not delete photo. Item not deleted.');
      return;
    }
  }

  const { error } = await supabase.from('inventory').delete().eq('id', id);
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
