# FIRESALE RUBBER Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a single-page static gallery website for FIRESALE RUBBER that reads inventory from a Google Sheet and displays it in a dark navy/gold branded layout.

**Architecture:** Single `index.html` page with a linked `style.css` and `app.js`. On page load, `app.js` fetches the Google Sheets CSV (via PapaParse CDN), parses active rows, and dynamically renders the product catalog grouped by category and thickness. No build step, no framework.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES6+), PapaParse (CDN), Vercel (static hosting), GitHub

---

## File Structure

```
pliteq-overstock/
├── index.html          # Page shell: head, header, banner, hero, filter tabs, #catalog placeholder, contact strip, footer
├── style.css           # All visual styles (tokens, layout, components)
├── app.js              # Config, CSV fetch, data parsing, DOM rendering, filter logic
└── vercel.json         # Static site config (optional, Vercel auto-detects)
```

---

## Chunk 1: Project scaffold and static shell

### Task 1: Initialize git repo and project files

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `app.js`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git and create files**

```bash
cd /Users/tomasgiannini/pliteq-overstock
git init
touch index.html style.css app.js .gitignore
```

- [ ] **Step 2: Write .gitignore**

```
.DS_Store
.superpowers/
node_modules/
```

- [ ] **Step 3: Write the HTML shell in index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FIRESALE RUBBER — Overstock Flooring</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
</head>
<body>
  <div class="site-wrapper">

    <!-- HEADER -->
    <header class="header">
      <div class="logo">
        <div class="logo-main">FIRESALE <span>RUBBER</span></div>
        <div class="logo-sub">New overstock flooring — clearance pricing</div>
      </div>
      <div class="header-right">
        <div class="header-contact">
          <div class="contact-name">Tomas Giannini</div>
          <div class="contact-number">416 788 1629</div>
        </div>
        <a href="tel:4167881629" class="cta-btn">Call Now</a>
      </div>
    </header>

    <!-- PICKUP BANNER -->
    <div class="pickup-banner">
      <span class="pickup-pin">📍</span>
      <span class="pickup-text">Pickup only — <strong>Vaughan, Ontario</strong></span>
      <span class="pickup-divider">|</span>
      <span class="pickup-sub">No shipping. Local pickup arranged after inquiry.</span>
    </div>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-left">
        <h1 class="hero-headline">Brand new rubber.<br><span>Clearance prices.</span></h1>
        <p class="hero-desc">New overstock rubber flooring — gym tiles, rolls, sheets and acoustic underlayment. First-quality products with minor cosmetic variations. Deep discounts available, all prices negotiated.</p>
      </div>
      <div class="hero-right">
        <div class="stat">
          <div class="stat-num" id="stat-items">—</div>
          <div class="stat-label">Items Available</div>
        </div>
        <div class="stat">
          <div class="stat-num" id="stat-categories">—</div>
          <div class="stat-label">Product Types</div>
        </div>
      </div>
    </section>

    <!-- FILTER TABS -->
    <nav class="filter-bar" id="filter-bar">
      <button class="filter-tab active" data-filter="all">All Products</button>
      <button class="filter-tab" data-filter="Puzzle Tiles">Puzzle Tiles</button>
      <button class="filter-tab" data-filter="Rolls">Rolls</button>
      <button class="filter-tab" data-filter="Sheets">Sheets</button>
      <button class="filter-tab" data-filter="Acoustic">Acoustic</button>
    </nav>

    <!-- CATALOG (populated by app.js) -->
    <main class="content" id="catalog">
      <div class="loading-msg">Loading inventory...</div>
    </main>

    <!-- CONTACT STRIP -->
    <div class="contact-strip">
      <div class="contact-strip-left">
        <h2 class="contact-strip-heading">See something you want?</h2>
        <p class="contact-strip-sub">All prices negotiated — call or text to discuss quantities and availability</p>
      </div>
      <div class="contact-strip-right">
        <div class="contact-strip-name">Tomas Giannini</div>
        <a href="tel:4167881629" class="contact-strip-number">416 788 1629</a>
      </div>
    </div>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footer-logo">FIRESALE RUBBER</div>
      <div class="footer-right">
        <p>Tomas Giannini — <a href="tel:4167881629">416 788 1629</a></p>
        <p>📍 Pickup only — Vaughan, Ontario</p>
        <p>New overstock flooring, minor cosmetic variations only</p>
      </div>
    </footer>

  </div><!-- /.site-wrapper -->

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify file opens in browser without errors**

Open `index.html` in a browser. Expected: page loads, shows "Loading inventory..." in the main area, no console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css app.js .gitignore
git commit -m "feat: initial project scaffold with HTML shell"
```

---

### Task 2: Write all CSS styles

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Write design tokens and reset**

```css
/* === TOKENS === */
:root {
  --bg: #0a0e1a;
  --surface: #111827;
  --border: #1e2535;
  --border-inner: #2a3350;
  --gold: #f0c040;
  --gold-dark: #4a3a00;
  --pickup-bg: #1a2e1a;
  --pickup-text: #5db87a;
  --text-primary: #ffffff;
  --text-muted: #888888;
  --blemish-text: #bb8877;
  --blemish-bg: #1a1208;
  --blemish-border: #c87;
  --badge-hot-bg: #f0c040;
  --badge-hot-text: #000000;
  --badge-limited-bg: #c0392b;
  --badge-limited-text: #ffffff;
}

/* === RESET === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text-primary); font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
```

- [ ] **Step 2: Write site wrapper and header styles**

```css
/* === SITE WRAPPER === */
.site-wrapper { min-width: 1024px; }

/* === HEADER === */
.header {
  background: linear-gradient(135deg, #0d1225 0%, var(--bg) 100%);
  border-bottom: 2px solid var(--gold);
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo-main { font-size: 22px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
.logo-main span { color: var(--gold); }
.logo-sub { font-size: 9px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
.header-right { display: flex; align-items: center; gap: 16px; }
.contact-name { font-size: 12px; font-weight: 700; text-align: right; }
.contact-number { font-size: 14px; font-weight: 900; color: var(--gold); letter-spacing: 1px; text-align: right; }
.cta-btn {
  background: var(--gold); color: var(--bg); font-size: 12px; font-weight: 800;
  padding: 10px 20px; border-radius: 4px; letter-spacing: 1px; text-transform: uppercase;
  border: none; white-space: nowrap;
}
.cta-btn:hover { background: #ffe060; }
```

- [ ] **Step 3: Write pickup banner, hero, and filter styles**

```css
/* === PICKUP BANNER === */
.pickup-banner {
  background: var(--pickup-bg);
  border-bottom: 1px solid #2d5a2d;
  padding: 12px 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pickup-pin { font-size: 16px; }
.pickup-text { font-size: 14px; font-weight: 800; color: var(--pickup-text); letter-spacing: 0.5px; text-transform: uppercase; }
.pickup-text strong { color: var(--text-primary); }
.pickup-divider { color: #2d5a2d; font-size: 14px; }
.pickup-sub { font-size: 12px; color: #4a9a60; }

/* === HERO === */
.hero {
  background: linear-gradient(135deg, #111827 0%, #0d1225 50%, #1a0f00 100%);
  border-bottom: 1px solid var(--border);
  padding: 40px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}
.hero-headline { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; line-height: 1.1; }
.hero-headline span { color: var(--gold); }
.hero-desc { color: var(--text-muted); font-size: 13px; margin-top: 10px; line-height: 1.6; max-width: 480px; }
.hero-right { display: flex; flex-direction: column; gap: 16px; align-items: flex-end; flex-shrink: 0; }
.stat { text-align: right; }
.stat-num { font-size: 32px; font-weight: 900; color: var(--gold); line-height: 1; }
.stat-label { font-size: 10px; color: #666; letter-spacing: 1px; text-transform: uppercase; }

/* === FILTER TABS === */
.filter-bar { padding: 20px 32px 0; display: flex; gap: 8px; flex-wrap: wrap; }
.filter-tab {
  padding: 8px 18px; border-radius: 4px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid var(--border-inner);
  color: var(--text-muted); background: transparent; transition: border-color 0.15s, color 0.15s;
}
.filter-tab:hover { border-color: var(--gold); color: var(--gold); }
.filter-tab.active { background: var(--gold); color: var(--bg); border-color: var(--gold); }
```

- [ ] **Step 4: Write catalog, category, and card styles**

```css
/* === CONTENT === */
.content { padding: 28px 32px 60px; }
.loading-msg { color: var(--text-muted); font-size: 14px; padding: 40px 0; }
.error-msg { color: var(--blemish-text); font-size: 14px; padding: 40px 0; }

/* === CATEGORY SECTION === */
.category-section { margin-bottom: 44px; }
.category-section[hidden] { display: none; }
.category-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.category-title { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
.category-count { font-size: 11px; color: var(--gold); font-weight: 700; letter-spacing: 1px; }

/* === THICKNESS GROUP === */
.thickness-group { margin-bottom: 24px; }
.thickness-label {
  display: inline-flex; align-items: center; font-size: 10px; font-weight: 700;
  color: var(--gold); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;
}
.thickness-label::before {
  content: ''; display: inline-block; width: 3px; height: 12px;
  background: var(--gold); margin-right: 8px; border-radius: 2px;
}

/* === PRODUCT GRID === */
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

/* === PRODUCT CARD === */
.product-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; overflow: hidden;
  transition: border-color 0.2s, transform 0.15s;
}
.product-card:hover { border-color: var(--gold); transform: translateY(-2px); }
.card-img {
  height: 140px; position: relative; background: var(--border);
  overflow: hidden;
}
.card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-badge {
  position: absolute; top: 8px; left: 8px; font-size: 8px; font-weight: 800;
  padding: 3px 7px; border-radius: 3px; letter-spacing: 1px; text-transform: uppercase;
}
.card-badge.hot { background: var(--badge-hot-bg); color: var(--badge-hot-text); }
.card-badge.limited { background: var(--badge-limited-bg); color: var(--badge-limited-text); }
.card-body { padding: 12px; }
.card-name { font-size: 12px; font-weight: 700; color: #eee; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.card-color { font-size: 10px; color: var(--text-muted); margin-bottom: 2px; }
.card-qty { font-size: 10px; color: #666; margin-bottom: 8px; }
.card-note {
  font-size: 9px; color: var(--blemish-text); font-style: italic;
  padding: 4px 6px; background: var(--blemish-bg);
  border-left: 2px solid var(--blemish-border); border-radius: 2px;
}
```

- [ ] **Step 5: Write contact strip and footer styles**

```css
/* === CONTACT STRIP === */
.contact-strip {
  background: var(--gold); padding: 28px 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
.contact-strip-heading { font-size: 18px; font-weight: 900; color: var(--bg); text-transform: uppercase; letter-spacing: 1px; }
.contact-strip-sub { font-size: 12px; color: var(--gold-dark); margin-top: 4px; }
.contact-strip-right { text-align: right; flex-shrink: 0; }
.contact-strip-name { font-size: 14px; font-weight: 700; color: var(--bg); }
.contact-strip-number { font-size: 28px; font-weight: 900; color: var(--bg); letter-spacing: 2px; line-height: 1.1; display: block; }
.contact-strip-number:hover { text-decoration: underline; }

/* === FOOTER === */
.footer {
  background: #060810; border-top: 2px solid var(--border);
  padding: 28px 32px; display: flex; justify-content: space-between; align-items: center;
}
.footer-logo { font-size: 16px; font-weight: 900; letter-spacing: 3px; color: var(--gold); }
.footer-right { text-align: right; }
.footer-right p { font-size: 11px; color: #444; margin-top: 3px; }
.footer-right a { color: #888; }
.footer-right a:hover { color: var(--gold); }
```

- [ ] **Step 6: Open index.html in browser and verify layout**

Expected: Full page renders with correct colours — dark navy background, gold accents, green pickup banner, sticky header. No content in catalog yet (shows "Loading inventory...").

- [ ] **Step 7: Commit**

```bash
git add style.css
git commit -m "feat: add full CSS styles with design tokens"
```

---

## Chunk 2: JavaScript — data fetching and rendering

### Task 3: Write app.js — config and CSV fetch

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Write config and fetch logic**

```js
// ============================================================
// CONFIG — paste your Google Sheets CSV URL here
// How to get it: File → Share → Publish to web → CSV
// Format: https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
// ============================================================
const SHEET_CSV_URL = 'PASTE_YOUR_SHEET_URL_HERE';

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  fetchInventory();
  setupFilterTabs(); // defined in Task 4
});

function fetchInventory() {
  const url = SHEET_CSV_URL + '&t=' + Date.now(); // cache-bust

  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const items = parseItems(results.data);
      updateStats(items);
      renderCatalog(items);
    },
    error: (err) => {
      showError();
    }
  });
}

function showError() {
  document.getElementById('catalog').innerHTML =
    '<p class="error-msg">Unable to load inventory at this time. Please call Tomas at <a href="tel:4167881629">416 788 1629</a>.</p>';
  document.getElementById('stat-items').textContent = '—';
  document.getElementById('stat-categories').textContent = '—';
}
```

- [ ] **Step 2: Write parseItems function**

```js
// ============================================================
// DATA PARSING
// ============================================================

// Expected CSV columns: category, thickness, name, color, quantity, notes, image_url, badge, active
function parseItems(rows) {
  return rows.filter(row => {
    const active = (row.active || '').trim().toLowerCase();
    return active === 'true';
  });
}
```

- [ ] **Step 3: Write updateStats function**

```js
// ============================================================
// HERO STATS
// ============================================================
function updateStats(items) {
  document.getElementById('stat-items').textContent = items.length;
  const categories = new Set(items.map(item => (item.category || '').trim()).filter(Boolean));
  document.getElementById('stat-categories').textContent = categories.size;
}
```

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: add CSV fetch, data parsing, and hero stats"
```

---

### Task 4: Write app.js — catalog rendering

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Write the renderCatalog function**

Groups items by category (in order of first appearance), then by thickness within each category. Renders category sections with thickness sub-headers and a 4-column product grid.

```js
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
  // Preserve insertion order (sheet row order)
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
  const slug = category.toLowerCase().replace(/\s+/g, '-');
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
```

- [ ] **Step 2: Write the renderCard function**

```js
function renderCard(item) {
  const badge = (item.badge || '').trim();
  const badgeHTML = badge
    ? `<span class="card-badge ${badge.toLowerCase()}">${escapeHTML(badge)}</span>`
    : '';

  const imgHTML = item.image_url
    ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.name)}" loading="lazy"
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
```

- [ ] **Step 3: Write XSS-safe helper functions**

```js
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
```

- [ ] **Step 4: Write the filter tab logic**

```js
// ============================================================
// FILTER TABS
// ============================================================
function setupFilterTabs() {
  const bar = document.getElementById('filter-bar');
  bar.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    // Update active tab
    bar.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Show/hide category sections
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
```

- [ ] **Step 5: Open index.html in browser and verify rendering with a test URL**

At this point `SHEET_CSV_URL` is a placeholder. To test rendering without a real sheet, temporarily replace it with a data URL test:

```js
// Temporary test — replace SHEET_CSV_URL line with:
const SHEET_CSV_URL = 'data:text/csv;charset=utf-8,' + encodeURIComponent(
  'category,thickness,name,color,quantity,notes,image_url,badge,active\n' +
  'Puzzle Tiles,3/4",Puzzle Tile,Black,~200 sqft,Minor discolouration,,Hot,TRUE\n' +
  'Puzzle Tiles,3/4",Puzzle Tile,Grey,~350 sqft,Small blemish,,,TRUE\n' +
  'Rolls,1/4",Rubber Roll,Black,2 rolls,Slight scuff,,Limited,TRUE\n' +
  'Rolls,1/4",Rubber Roll,Green,1 partial roll,Colour variation,,,FALSE\n'
);
```

Expected: 2 category sections (Puzzle Tiles with 2 cards, Rolls with 1 card — the FALSE row hidden). Hero stats show "3 Items Available, 2 Product Types". Filter tabs work.

- [ ] **Step 6: Revert test URL to placeholder, commit**

```bash
# Restore: const SHEET_CSV_URL = 'PASTE_YOUR_SHEET_URL_HERE';
git add app.js
git commit -m "feat: add catalog rendering, card rendering, and filter tab logic"
```

---

## Chunk 3: GitHub repo and Vercel deployment

### Task 5: Create GitHub repository

**Files:** none (git operations only)

**Prerequisite:** All Task 1–4 commits must be made before this step. `git log --oneline` should show at least 4 commits.

- [ ] **Step 1: Confirm commits exist**

```bash
git log --oneline
```

Expected: at least 4 commits visible. If not, complete outstanding task commits first.

- [ ] **Step 2: Create repo on GitHub via gh CLI**

```bash
cd /Users/tomasgiannini/pliteq-overstock
gh repo create firesale-rubber --public --description "FIRESALE RUBBER — overstock flooring gallery" --source=. --remote=origin --push
```

Expected output: GitHub repo URL printed (e.g. `https://github.com/tomasgiannini/firesale-rubber`).

- [ ] **Step 3: Verify repo is live**

```bash
gh repo view --web
```

Expected: GitHub repo page opens in browser showing the project files.

---

### Task 6: Deploy to Vercel

**Files:**
- Create: `vercel.json` (optional, for clean URLs)

- [ ] **Step 1: Install Vercel CLI if not present**

```bash
which vercel || npm install -g vercel
```

- [ ] **Step 2: Deploy to Vercel**

```bash
cd /Users/tomasgiannini/pliteq-overstock
vercel --yes
```

When prompted:
- Set up and deploy: **Y**
- Which scope: select your account
- Link to existing project: **N**
- Project name: `firesale-rubber`
- Directory: `.` (current)
- Override settings: **N**

Expected: Vercel prints a preview URL like `https://firesale-rubber-xxxx.vercel.app`

- [ ] **Step 3: Promote to production**

```bash
vercel --prod
```

Expected: Vercel prints production URL like `https://firesale-rubber.vercel.app`

- [ ] **Step 4: Open production URL and verify**

Expected: Site loads from Vercel CDN, same as local. Shows "Loading inventory..." until a real sheet URL is configured.

- [ ] **Step 5: Commit vercel config if created**

```bash
git add -A
git commit -m "chore: add vercel deployment config"
git push origin main
```

---

### Task 7: Wire up real Google Sheet

**No code changes — configuration only.**

- [ ] **Step 1: Set up the Google Sheet**

Create a new Google Sheet with these exact column headers in row 1:
```
category | thickness | name | color | quantity | notes | image_url | badge | active
```

Add a few test rows using real inventory data.

- [ ] **Step 2: Publish the sheet as CSV**

1. File → Share → Publish to web
2. Select: **Entire Document** → **Comma-separated values (.csv)**
3. Click Publish → copy the URL
4. URL format will be: `https://docs.google.com/spreadsheets/d/.../pub?output=csv`

- [ ] **Step 3: Paste URL into app.js**

Open `app.js`, replace:
```js
const SHEET_CSV_URL = 'PASTE_YOUR_SHEET_URL_HERE';
```
with the real URL:
```js
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?output=csv';
```

- [ ] **Step 4: Test locally**

Open `index.html` in browser. Expected: real inventory items appear in the catalog.

- [ ] **Step 5: Commit and push — triggers auto-redeploy on Vercel**

```bash
git add app.js
git commit -m "config: wire up Google Sheets CSV URL"
git push origin main
```

- [ ] **Step 6: Verify production URL shows live inventory**

Open the Vercel production URL in the browser.

Expected:
- Hero stats show real item and category counts (not "—")
- At least one category section appears with product cards
- Filter tabs work (clicking "Puzzle Tiles" hides other categories)
- Green pickup banner visible below header
- Contact strip and footer show "Tomas Giannini — 416 788 1629"

If the site shows the error message ("Unable to load inventory") instead of products, the CSV URL is wrong or the sheet is not published — re-check Step 2 of Task 7.

---

## Done

The site is live. Share the Vercel URL with potential buyers.

**Future updates:**
- Add inventory: edit the Google Sheet → refreshes on next page load automatically
- Upload photos: drag to Imgur → paste URL into `image_url` column
- Remove sold items: set `active` to `FALSE`
