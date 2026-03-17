// Credentials loaded from config.js
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allItems = []; // stored for lightbox lookup

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  fetchInventory();
  setupFilterTabs();
  setupLightbox();
});

async function fetchInventory() {
  // Catalog shows "Loading inventory..." (existing HTML) while fetch is in flight
  const { data, error } = await sb
    .from('inventory')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    showError();
    return;
  }

  allItems = data;
  updateStats(data);
  renderCatalog(data);
}

function showError() {
  document.getElementById('catalog').innerHTML =
    '<p class="error-msg">Unable to load inventory at this time. Please call Tomas at <a href="tel:4167881629">416 788 1629</a>.</p>';
  document.getElementById('stat-items').textContent = '—';
  document.getElementById('stat-categories').textContent = '—';
}

// ============================================================
// HERO STATS
// ============================================================
function updateStats(items) {
  document.getElementById('stat-items').textContent = items.length;
  const categories = new Set(items.map(item => (item.category || '').trim()).filter(Boolean));
  document.getElementById('stat-categories').textContent = categories.size;
}

// ============================================================
// CATALOG RENDERING
// ============================================================
function renderCatalog(items) {
  const catalog = document.getElementById('catalog');

  if (items.length === 0) {
    catalog.innerHTML = '<p class="loading-msg">No inventory available at this time. Check back soon or call Tomas at <a href="tel:4167881629">416 788 1629</a>.</p>';
    return;
  }

  // Group items: { category -> { thickness -> [items] } }
  // Preserve insertion order (created_at ASC = sheet row order equivalent)
  const grouped = new Map();
  for (const item of items) {
    const cat = (item.category || '').trim();
    const thick = (item.thickness || '').trim();
    if (!grouped.has(cat)) grouped.set(cat, new Map());
    const catMap = grouped.get(cat);
    if (!catMap.has(thick)) catMap.set(thick, []);
    catMap.get(thick).push(item);
  }

  // Sort thickness groups within each category from smallest to largest
  for (const [, thicknessMap] of grouped) {
    const sorted = [...thicknessMap.entries()].sort((a, b) => (parseFloat(a[0]) || 0) - (parseFloat(b[0]) || 0));
    thicknessMap.clear();
    for (const [k, v] of sorted) thicknessMap.set(k, v);
  }

  const html = [];
  for (const [category, thicknessMap] of grouped) {
    const totalItems = [...thicknessMap.values()].flat().length;
    html.push(renderCategorySection(category, thicknessMap, totalItems));
  }

  catalog.innerHTML = html.join('');
}

function renderCategorySection(category, thicknessMap, totalItems) {
  const thicknessHTML = [...thicknessMap.entries()]
    .map(([thickness, items]) => renderThicknessGroup(thickness, items))
    .join('');

  return `
    <section class="category-section" data-category="${escapeAttr(category)}">
      <div class="category-header">
        <h2 class="category-title">${escapeHTML(category)}</h2>
        <span class="category-count">${totalItems} item${totalItems !== 1 ? 's' : ''} available</span>
      </div>
      ${thicknessHTML}
    </section>
  `;
}

function renderThicknessGroup(thickness, items) {
  const cardsHTML = items.map(renderCard).join('');
  return `
    <div class="thickness-group">
      <div class="thickness-label">${formatThickness(thickness)}</div>
      <div class="product-grid">${cardsHTML}</div>
    </div>
  `;
}

function renderCard(item) {
  const badge = (item.badge || '').trim();
  const badgeHTML = badge
    ? `<span class="card-badge ${badge.toLowerCase()}">${escapeHTML(badge)}</span>`
    : '';

  const imageUrls = parseImageUrls(item.image_url);
  const imgHTML = imageUrls.length
    ? imageUrls.map((url, i) => `<img src="${escapeAttr(url)}" alt="${escapeAttr(item.name || '')}" loading="lazy"
         onerror="this.style.display='none'" class="${i > 0 ? 'card-img-extra' : ''}">`).join('')
    : '';

  const noteHTML = item.notes
    ? `<div class="card-note">${escapeHTML(item.notes)}</div>`
    : '';

  return `
    <div class="product-card" data-item-id="${escapeAttr(item.id)}">
      <div class="card-img">
        ${imgHTML}
        ${badgeHTML}
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHTML(item.name || '')}</div>
        <div class="card-color">Color: ${escapeHTML(item.color || '')}</div>
        ${item.size ? `<div class="card-size">Size: ${escapeHTML(item.size)}</div>` : ''}
        <div class="card-qty">${escapeHTML(item.quantity || '')}</div>
        ${noteHTML}
      </div>
    </div>
  `;
}

// ============================================================
// FILTER TABS
// ============================================================
function setupFilterTabs() {
  const bar = document.getElementById('filter-bar');
  bar.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    bar.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const filter = tab.dataset.filter;
    document.querySelectorAll('.category-section').forEach(section => {
      if (filter === 'all' || section.dataset.category === filter) {
        section.hidden = false;
      } else {
        section.hidden = true;
      }
    });
  });
}

// ============================================================
// LIGHTBOX
// ============================================================
function setupLightbox() {
  const overlay = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightbox-close');

  // Click on card opens lightbox
  document.getElementById('catalog').addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    const id = card.dataset.itemId;
    const item = allItems.find(i => i.id === id);
    if (item) openLightbox(item);
  });

  // Close on X button, overlay click, or Escape
  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function openLightbox(item) {
  const content = document.getElementById('lightbox-content');
  const imageUrls = parseImageUrls(item.image_url);

  const imagesHTML = imageUrls.length
    ? `<div class="lightbox-images">${imageUrls.map(url =>
        `<img src="${escapeAttr(url)}" alt="${escapeAttr(item.name || '')}">`
      ).join('')}</div>`
    : '';

  const noteHTML = item.notes
    ? `<div class="lightbox-note">${escapeHTML(item.notes)}</div>`
    : '';

  content.innerHTML = `
    ${imagesHTML}
    <div class="lightbox-info">
      <div class="lightbox-name">${escapeHTML(item.name || 'Untitled')}</div>
      ${item.category ? `<div class="lightbox-detail"><span>Category:</span> ${escapeHTML(item.category)}</div>` : ''}
      ${item.thickness ? `<div class="lightbox-detail"><span>Thickness:</span> ${formatThickness(item.thickness)}</div>` : ''}
      ${item.size ? `<div class="lightbox-detail"><span>Size:</span> ${escapeHTML(item.size)}</div>` : ''}
      ${item.color ? `<div class="lightbox-detail"><span>Color:</span> ${escapeHTML(item.color)}</div>` : ''}
      ${item.quantity ? `<div class="lightbox-detail"><span>Quantity:</span> ${escapeHTML(item.quantity)}</div>` : ''}
      ${noteHTML}
      <div class="lightbox-cta">Interested? Call or text <a href="tel:4167881629">416 788 1629</a></div>
    </div>
  `;

  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================================
// HELPERS
// ============================================================
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

function formatThickness(val) {
  if (!val) return '';
  const mm = parseFloat(val);
  if (isNaN(mm)) return escapeHTML(val);
  return `${mm}mm`;
}

function parseImageUrls(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { /* not JSON */ }
  return [value];
}
