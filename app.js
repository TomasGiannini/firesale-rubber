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
      <div class="thickness-label">${escapeHTML(thickness)}</div>
      <div class="product-grid">${cardsHTML}</div>
    </div>
  `;
}

function renderCard(item) {
  const badge = (item.badge || '').trim();
  const badgeHTML = badge
    ? `<span class="card-badge ${badge.toLowerCase()}">${escapeHTML(badge)}</span>`
    : '';

  const imgHTML = item.image_url
    ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.name || '')}" loading="lazy"
         onerror="this.style.display='none'">`
    : '';

  const noteHTML = item.notes
    ? `<div class="card-note">${escapeHTML(item.notes)}</div>`
    : '';

  return `
    <div class="product-card">
      <div class="card-img">
        ${imgHTML}
        ${badgeHTML}
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHTML(item.name || '')}</div>
        <div class="card-color">Color: ${escapeHTML(item.color || '')}</div>
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
