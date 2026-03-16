# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Google Sheets with Supabase as the data source and build a local `admin.html` dashboard for managing inventory (add, edit, delete items with photo uploads).

**Architecture:** Supabase provides a PostgreSQL `inventory` table and a public `product-images` storage bucket. The existing `app.js` fetch logic is swapped from PapaParse/CSV to Supabase JS SDK. A new standalone `admin.html` file (opened locally in the browser) handles all CRUD operations and photo uploads — no server, no auth.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS SDK v2 (CDN), Supabase cloud (free tier)

---

## File Structure

```
pliteq-overstock/
├── config.js         — NEW: shared SUPABASE_URL and SUPABASE_ANON_KEY constants
├── index.html        — add config.js + Supabase SDK script tags; remove PapaParse
├── app.js            — replace fetchInventory() with Supabase query; all rendering unchanged
├── admin.html        — NEW: full admin dashboard (form + inventory list); loads config.js + admin.js
└── admin.js          — NEW: admin dashboard logic (CRUD, photo upload)
```

**Column name note:** Supabase returns rows with the same snake_case column names as the CSV headers (`category`, `thickness`, `name`, `color`, `quantity`, `notes`, `image_url`, `badge`, `active`). All existing rendering functions in `app.js` use these exact names — no changes needed to rendering logic.

---

## Chunk 1: Supabase setup + app.js migration

### Task 1: Create Supabase project and table

**Files:** none (cloud setup only)

- [ ] **Step 1: Create a free Supabase project**

Go to https://supabase.com → New project. Choose a name (e.g. `firesale-rubber`), set a database password, pick a region close to you. Wait for it to provision (~1 min).

- [ ] **Step 2: Create the inventory table**

In the Supabase dashboard → SQL Editor → New query. Run:

```sql
create table inventory (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  thickness text not null,
  name text not null,
  color text not null default '',
  quantity text not null default '',
  notes text,
  image_url text,
  badge text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Disable RLS on inventory table**

In SQL Editor:

```sql
alter table inventory disable row level security;
```

- [ ] **Step 4: Create the product-images storage bucket**

Go to Storage → New bucket. Name: `product-images`. Toggle **Public bucket** ON. Click Create.

- [ ] **Step 5: Note your credentials**

Go to Project Settings → API. Copy:
- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **anon public** key (long JWT string)

With RLS disabled, the anon key has full SELECT/INSERT/UPDATE/DELETE access on all tables. This is intentional — the admin is local-only and the data is non-sensitive.

- [ ] **Step 6: Create config.js with your credentials**

Create `/Users/tomasgiannini/pliteq-overstock/config.js`:

```js
// Supabase credentials — shared by index.html and admin.html
const SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY';
```

Replace the placeholder strings with your actual values from Step 5.

---

### Task 2: Update app.js and index.html to use Supabase

**Files:**
- Modify: `index.html`
- Modify: `app.js`

- [ ] **Step 1: Swap script tags in index.html**

Replace:
```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
```
With:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="config.js"></script>
```

- [ ] **Step 2: Replace the top of app.js with Supabase client and new fetchInventory**

Replace everything from line 1 through the closing `}` of `fetchInventory()` (lines 1–32) with:

```js
// Credentials loaded from config.js
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  fetchInventory();
  setupFilterTabs();
});

async function fetchInventory() {
  // Catalog shows "Loading inventory..." (existing HTML) while fetch is in flight
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    showError();
    return;
  }

  updateStats(data);
  renderCatalog(data);
}
```

- [ ] **Step 3: Remove parseItems — no longer needed**

Delete the entire `parseItems` function (it was only needed to filter the CSV `active` column — Supabase filters this server-side now).

- [ ] **Step 4: Open index.html in browser and verify**

Open `index.html` locally. Expected: "Loading inventory..." briefly, then "No inventory available at this time" (table is empty — correct). Hero stats show `0` and `0`. No console errors.

If you see the error message instead, open the browser console — likely a credential mismatch or the config.js wasn't loaded.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js
git commit -m "feat: migrate data source from Google Sheets to Supabase"
```

---

## Chunk 2: Admin dashboard

### Task 3: Build admin.html — structure and styles

**Files:**
- Create: `admin.html`

- [ ] **Step 1: Write admin.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FIRESALE RUBBER — Admin</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="config.js"></script>
  <style>
    /* === RESET & BASE === */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f4f4f4; color: #222; }
    a { color: inherit; }

    /* === LAYOUT === */
    .admin-header {
      background: #0a0e1a; color: #fff; padding: 16px 32px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 2px solid #f0c040;
    }
    .admin-header h1 { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
    .admin-header h1 span { color: #f0c040; }
    .admin-header a { font-size: 12px; color: #f0c040; }
    .admin-body { max-width: 960px; margin: 0 auto; padding: 32px 24px; }

    /* === FORM CARD === */
    .form-card {
      background: #fff; border-radius: 8px; padding: 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 40px;
    }
    .form-card h2 { font-size: 16px; font-weight: 700; margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group.full { grid-column: 1 / -1; }
    label { font-size: 12px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
    input, select, textarea {
      border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px;
      font-size: 13px; font-family: inherit; background: #fafafa;
    }
    input:focus, select:focus, textarea:focus { outline: 2px solid #f0c040; border-color: #f0c040; background: #fff; }
    textarea { resize: vertical; min-height: 64px; }

    /* === PHOTO UPLOAD === */
    .upload-area {
      border: 2px dashed #ddd; border-radius: 6px; padding: 20px;
      text-align: center; cursor: pointer; transition: border-color 0.15s;
      background: #fafafa; min-height: 100px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    }
    .upload-area:hover, .upload-area.drag-over { border-color: #f0c040; background: #fffdf0; }
    .upload-area p { font-size: 12px; color: #888; }
    .upload-area input[type="file"] { display: none; }
    .upload-preview { width: 100%; max-height: 160px; object-fit: contain; border-radius: 4px; }
    .upload-spinner { font-size: 12px; color: #888; }

    /* === ACTIVE TOGGLE === */
    .checkbox-group { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .checkbox-group input[type="checkbox"] { width: 16px; height: 16px; accent-color: #f0c040; }
    .checkbox-group label { text-transform: none; font-size: 13px; color: #333; font-weight: 400; }

    /* === FORM ACTIONS === */
    .form-actions { display: flex; gap: 10px; margin-top: 20px; align-items: center; }
    .btn-save {
      background: #f0c040; color: #0a0e1a; font-weight: 800; font-size: 13px;
      padding: 10px 24px; border: none; border-radius: 4px; cursor: pointer; letter-spacing: 0.5px;
    }
    .btn-save:hover { background: #ffe060; }
    .btn-save:disabled { background: #ddd; color: #999; cursor: not-allowed; }
    .btn-cancel {
      background: transparent; color: #888; font-size: 13px; font-weight: 600;
      padding: 10px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;
    }
    .btn-cancel:hover { border-color: #bbb; color: #555; }
    .form-error { font-size: 12px; color: #c0392b; margin-top: 4px; }
    .form-success { font-size: 12px; color: #27ae60; margin-top: 4px; }

    /* === INVENTORY LIST === */
    .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .list-header h2 { font-size: 16px; font-weight: 700; }
    .list-count { font-size: 12px; color: #888; }
    .item-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .item-table th { background: #f8f8f8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
    .item-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; vertical-align: middle; }
    .item-table tr:last-child td { border-bottom: none; }
    .item-table tr.inactive td { opacity: 0.45; }
    .thumb { width: 48px; height: 36px; object-fit: cover; border-radius: 3px; background: #eee; display: block; }
    .no-thumb { width: 48px; height: 36px; background: #eee; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #bbb; }
    .badge-pill { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; }
    .badge-pill.hot { background: #f0c040; color: #000; }
    .badge-pill.limited { background: #c0392b; color: #fff; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.active { background: #27ae60; }
    .status-dot.inactive { background: #bbb; }
    .btn-edit { font-size: 11px; font-weight: 600; padding: 4px 10px; border: 1px solid #ddd; border-radius: 3px; background: #fff; cursor: pointer; }
    .btn-edit:hover { border-color: #f0c040; color: #b08000; }
    .btn-delete { font-size: 11px; font-weight: 600; padding: 4px 10px; border: 1px solid #fcc; border-radius: 3px; background: #fff; cursor: pointer; color: #c0392b; margin-left: 4px; }
    .btn-delete:hover { background: #fef0f0; }
    .empty-list { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }
    .list-loading { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }
  </style>
</head>
<body>

  <div class="admin-header">
    <h1>FIRESALE <span>RUBBER</span> — Admin</h1>
    <a href="index.html">← View site</a>
  </div>

  <div class="admin-body">

    <!-- FORM -->
    <div class="form-card">
      <h2 id="form-title">Add New Item</h2>
      <div class="form-grid">

        <!-- Photo upload -->
        <div class="form-group full">
          <label>Photo</label>
          <div class="upload-area" id="upload-area">
            <input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp">
            <img class="upload-preview" id="upload-preview" style="display:none">
            <p id="upload-prompt">Click to upload or drag a photo here</p>
            <p class="upload-spinner" id="upload-spinner" style="display:none">Uploading...</p>
          </div>
        </div>

        <!-- Category -->
        <div class="form-group">
          <label for="f-category">Category</label>
          <select id="f-category">
            <option value="">— Select —</option>
            <option value="Puzzle Tiles">Puzzle Tiles</option>
            <option value="Rolls">Rolls</option>
            <option value="Sheets">Sheets</option>
            <option value="Acoustic">Acoustic</option>
          </select>
        </div>

        <!-- Thickness -->
        <div class="form-group">
          <label for="f-thickness">Thickness</label>
          <input type="text" id="f-thickness" placeholder='e.g. 3/4"'>
        </div>

        <!-- Name -->
        <div class="form-group">
          <label for="f-name">Product Name</label>
          <input type="text" id="f-name" placeholder="e.g. Puzzle Tile">
        </div>

        <!-- Color -->
        <div class="form-group">
          <label for="f-color">Color</label>
          <input type="text" id="f-color" placeholder="e.g. Black">
        </div>

        <!-- Quantity -->
        <div class="form-group">
          <label for="f-quantity">Quantity</label>
          <input type="text" id="f-quantity" placeholder="e.g. ~200 sqft">
        </div>

        <!-- Badge -->
        <div class="form-group">
          <label for="f-badge">Badge</label>
          <select id="f-badge">
            <option value="">None</option>
            <option value="Hot">Hot</option>
            <option value="Limited">Limited</option>
          </select>
        </div>

        <!-- Notes -->
        <div class="form-group full">
          <label for="f-notes">Cosmetic Notes</label>
          <textarea id="f-notes" placeholder="e.g. Minor discolouration on select edges"></textarea>
        </div>

        <!-- Active -->
        <div class="form-group full">
          <div class="checkbox-group">
            <input type="checkbox" id="f-active" checked>
            <label for="f-active">Visible on site (uncheck to hide without deleting)</label>
          </div>
        </div>

      </div>

      <div class="form-actions">
        <button class="btn-save" id="btn-save">Save Item</button>
        <button class="btn-cancel" id="btn-cancel" style="display:none">Cancel</button>
        <span class="form-error" id="form-error"></span>
        <span class="form-success" id="form-success"></span>
      </div>
    </div>

    <!-- INVENTORY LIST -->
    <div>
      <div class="list-header">
        <h2>Current Inventory</h2>
        <span class="list-count" id="list-count"></span>
      </div>
      <div id="inventory-list">
        <div class="list-loading">Loading inventory...</div>
      </div>
    </div>

  </div>

  <script src="admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify admin.html opens without errors**

Open `admin.html` in browser. Expected: header, empty form, "Loading inventory..." text. No console errors (admin.js doesn't exist yet — that's fine, it will 404 silently or error, which is expected at this stage).

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "feat: add admin dashboard HTML and styles"
```

---

### Task 4: Build admin.js — Supabase client, state, and inventory list

**Files:**
- Create: `admin.js`

- [ ] **Step 1: Write config, Supabase client, and state**

```js
// Credentials loaded from config.js (included before this script in admin.html)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// STATE
// ============================================================
let editingId = null;       // uuid of item being edited, or null in add mode
let currentImageUrl = null; // image_url for the item being added/edited
let uploading = false;      // true while a photo upload is in progress
```

- [ ] **Step 2: Write bootstrap and loadInventory**

```js
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
    listEl.innerHTML = '<div class="list-loading">Failed to load inventory.</div>';
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
```

- [ ] **Step 3: Open admin.html and verify the inventory list renders**

Expected: table renders with column headers, "0 items" count, and the empty state message. No console errors.

- [ ] **Step 5: Commit**

```bash
git add admin.js
git commit -m "feat: add admin.js with Supabase client and inventory list rendering"
```

---

### Task 5: Build admin.js — photo upload

**Files:**
- Modify: `admin.js`

- [ ] **Step 1: Write setupUpload and helper functions**

```js
// ============================================================
// PHOTO UPLOAD
// ============================================================
function setupUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('photo-input');

  // Click to open file picker
  area.addEventListener('click', (e) => {
    if (e.target === input) return;
    input.click();
  });

  // File selected via picker
  input.addEventListener('change', () => {
    if (input.files[0]) uploadPhoto(input.files[0]);
  });

  // Drag and drop
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

  // Upload new image first — only delete old one on success
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, file, { contentType: file.type, upsert: false });

  uploading = false;
  spinner.style.display = 'none';

  if (error) {
    prompt.style.display = 'block';
    showError('Photo upload failed. Try again.');
    return;
  }

  // New upload succeeded — now delete old image (best-effort, don't block on failure)
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

// Returns true if deletion succeeded, false otherwise.
async function deleteStorageImage(imageUrl) {
  const path = getStoragePath(imageUrl);
  if (!path) return true; // nothing to delete
  const { error } = await supabase.storage.from('product-images').remove([path]);
  return !error;
}
```

- [ ] **Step 2: Open admin.html, drag a photo onto the upload area**

Expected: spinner shows briefly, then a preview of the photo appears. No console errors. Check the Supabase Storage dashboard — the image should appear in the `product-images` bucket.

- [ ] **Step 3: Commit**

```bash
git add admin.js
git commit -m "feat: add photo upload to admin dashboard"
```

---

### Task 6: Build admin.js — save and delete

**Files:**
- Modify: `admin.js`

- [ ] **Step 1: Write setupForm, getFormData, and resetForm**

```js
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
```

- [ ] **Step 2: Write saveItem**

```js
async function saveItem() {
  clearMessages();
  const data = getFormData();

  // Basic validation
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
```

- [ ] **Step 3: Write startEdit and deleteItem**

```js
async function startEdit(id) {
  clearMessages();

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) { showError('Could not load item. Try again.'); return; }

  // Populate form
  editingId = id;
  currentImageUrl = data.image_url || null;
  document.getElementById('f-category').value = data.category;
  document.getElementById('f-thickness').value = data.thickness;
  document.getElementById('f-name').value = data.name;
  document.getElementById('f-color').value = data.color;
  document.getElementById('f-quantity').value = data.quantity;
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

  // Scroll to form
  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
}

async function deleteItem(id, imageUrl) {
  if (!confirm('Delete this item? This cannot be undone.')) return;

  // Delete storage image first (if exists)
  if (imageUrl) {
    const storageOk = await deleteStorageImage(imageUrl);
    if (!storageOk) {
      showError('Could not delete photo. Item not deleted.');
      return;
    }
  }

  // Delete row
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) {
    showError('Delete failed. The photo was removed but the item record remains — try deleting again.');
    return;
  }

  loadInventory();
}
```

- [ ] **Step 4: Write message helpers and escape utilities**

```js
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
```

- [ ] **Step 5: End-to-end test**

Open `admin.html`. Do each of the following:

1. **Add item:** fill in category (Puzzle Tiles), thickness (3/4"), name (Test Tile), color (Black), quantity (~100 sqft). Upload a photo. Click Save. Expected: "Item added." message, item appears in list below, photo visible in thumbnail.

2. **Edit item:** click Edit on the row. Expected: form pre-fills with item data, photo preview shown, form title says "Edit Item". Change the color to "Grey". Click Save. Expected: "Item updated.", list refreshes with new color.

3. **Hide item:** click Edit, uncheck "Visible on site", Save. Expected: row appears at reduced opacity in admin list.

4. **Delete item:** click Delete, confirm. Expected: row removed from list. Check Supabase Storage — image should also be gone.

- [ ] **Step 6: Commit**

```bash
git add admin.js
git commit -m "feat: add save, edit, delete, and form reset to admin dashboard"
```

---

## Chunk 3: Deploy and verify

### Task 7: Push to GitHub and verify Vercel deployment

**Files:** none

- [ ] **Step 1: Push all changes**

```bash
git push origin main
```

- [ ] **Step 2: Confirm Vercel build passes**

Open the Vercel dashboard. Expected: new deployment triggered, build status shows "Ready" within ~30 seconds. If it shows "Error", check the build logs — most likely a file path issue.

- [ ] **Step 3: Smoke-test the live site**

Open the production Vercel URL. Expected:
- Page loads (no blank screen, no JS errors in browser console)
- "No inventory available" or real items if any were added via admin
- Filter tabs respond to clicks

If the site shows the error message ("Unable to load inventory"), the Supabase credentials in `config.js` may be wrong. Fix in `config.js`, commit, and push again.

- [ ] **Step 4: Add your first real inventory item via admin.html**

Open `admin.html` locally (double-click the file). Add one real product with a photo. Expected: item appears in the admin list immediately. Reload the live Vercel URL — the item should appear on the public site within seconds.

- [ ] **Step 5: Rollback if needed**

If the Vercel deploy is broken and the site is down, revert to the previous working commit:
```bash
git revert HEAD --no-edit
git push origin main
```
This restores the Google Sheets version while you debug.

---

## Done

**To manage inventory going forward:**
- Open `admin.html` in your browser (double-click the file)
- Add, edit, or delete items — changes appear on the live site immediately
