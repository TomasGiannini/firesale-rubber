# FIRESALE RUBBER — Design Spec

**Date:** 2026-03-16
**Owner:** Tomas Giannini
**Contact:** 416 788 1629

---

## Overview

A public-facing gallery website for selling overstock rubber flooring. Items are brand new but have minor cosmetic variations (miscolouring, small blemishes) that prevent sale through regular Pliteq channels. The site acts as a browsable catalog — buyers browse, then call Tomas to negotiate pricing and arrange pickup.

**No e-commerce. No cart. No pricing. Call to inquire.**

---

## Goals

- Give potential buyers a clear view of all available inventory
- Easy to share via email to large groups
- Easy for Tomas to update as inventory changes
- Pickup in Vaughan, Ontario — no shipping

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS (single `index.html`) | No build step, deploys as static file, easy to maintain |
| Data source | Google Sheets (published as CSV) | Tomas can update inventory without touching code |
| Image hosting | Imgur (free) | Simple drag-drop upload, direct image URLs |
| Hosting | Vercel (free tier) | Zero-config static deploys, fast CDN |

---

## Data Model (Google Sheet)

One row per inventory item. Tomas will publish the sheet as a CSV via File → Share → Publish to web → CSV. The published URL is pasted into a `config` variable at the top of `index.html`.

Columns:

| Column | Type | Example | Notes |
|---|---|---|---|
| `category` | text | `Puzzle Tiles` | Must be one of the 4 canonical values below |
| `thickness` | text | `3/4"` | Free text, used as sub-header label |
| `name` | text | `Puzzle Tile` | Display name on card |
| `color` | text | `Black` | Free text |
| `quantity` | text | `~200 sqft available` | Free text, displayed as-is |
| `notes` | text | `Minor discolouration on select edges` | Free text, displayed in amber highlight |
| `image_url` | URL | `https://i.imgur.com/abc123.jpg` | Direct Imgur image link |
| `badge` | text | `Hot` or `Limited` or blank | Controls card badge |
| `active` | text | `TRUE` or `FALSE` | Rows with `FALSE` are hidden |

**Canonical category values** (must match exactly for filter tabs to work):
- `Puzzle Tiles`
- `Rolls`
- `Sheets`
- `Acoustic`

---

## Site Structure

### Header (sticky)
- Left: Logo — **FIRESALE RUBBER** (white + gold accent on "RUBBER"), tagline below: "New overstock flooring — clearance pricing"
- Right: "Tomas Giannini" in white, "416 788 1629" in gold below it, then a gold "Call Now" button

### Pickup Banner (immediately below header)
- Full-width bar with dark green background (`#1a2e1a`) and green text (`#5db87a`)
- Text: "📍 Pickup only — Vaughan, Ontario  |  No shipping. Local pickup arranged after inquiry."
- This is the only green element on the page — it does not conflict with the gold/navy palette

### Hero Section
- Left column: Headline "Brand new rubber. Clearance prices." + 1–2 sentence description
- Right column: 2 stats derived from the sheet data:
  - Total active item count
  - Number of distinct categories represented
  - (No sqft total — quantity is free-text and not safely summable)
- No decorative pill badges

### Filter Tabs (below hero)
- Tabs: **All Products** | **Puzzle Tiles** | **Rolls** | **Sheets** | **Acoustic**
- Active tab: gold background, dark text
- Inactive: transparent with dark border, muted text
- Filtering is client-side, no page reload
- Tabs do not show item counts

### Product Catalog
Visually organized as **Category → Thickness → Cards**:

```
[Category Header: "Puzzle Tiles"  ·  5 items]
  [Thickness sub-header: ▌ 3/4" Thick — Heavy Duty]
    [card] [card] [card] [card]  ← 4-column grid
  [Thickness sub-header: ▌ 1/2" Thick — Standard]
    [card] [card]

[Category Header: "Rolls"  ·  2 items]
  [Thickness sub-header: ▌ 1/4" Thick]
    [card] [card]
```

Category sections are DOM elements with a `data-category` attribute. When a filter tab is active, all sections except the matching one are hidden via `display: none`.

Category item counts shown in the header reflect only active (visible) items in that category.

### Product Card
- Full-width photo (height: 140px, `object-fit: cover`)
- If no image URL: dark placeholder background
- Badge (top-left corner, absolute positioned):
  - `Hot` → gold background (`#f0c040`), black text
  - `Limited` → red background (`#c0392b`), white text
  - Blank → no badge rendered
- Product name (bold, uppercase, small)
- Color
- Quantity (muted text)
- Blemish/cosmetic note (amber text on dark amber background, left border accent)
- No button, no price

### Contact Strip (gold, mid-page)
- Gold background (`#f0c040`), dark text
- Left: "See something you want?" heading + "All prices negotiated — call or text to discuss quantities and availability"
- Right: "Tomas Giannini" + "416 788 1629" (large, bold)

### Footer
- Dark background, gold logo wordmark
- Right: Tomas Giannini — 416 788 1629, pickup location, cosmetic note

---

## Visual Design

| Token | Value |
|---|---|
| Page background | `#0a0e1a` |
| Card background | `#111827` |
| Card border | `#1e2535` |
| Gold accent | `#f0c040` |
| Pickup banner bg | `#1a2e1a` |
| Pickup banner text | `#5db87a` |
| Text primary | `#ffffff` |
| Text muted | `#888888` |
| Blemish note text | `#bb8877` |
| Blemish note bg | `#1a1208` |
| Font | System UI stack (no web font) |

---

## Data Parsing & Fetching

- Use [PapaParse](https://www.papaparse.com/) (CDN, no build step) to parse the CSV — handles commas and newlines inside quoted cells correctly
- Fetch on page load only (no polling). Append `?t=<timestamp>` to the CSV URL to bust browser cache on each load
- The Google Sheets CSV URL format is: `https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0`
  - Must be published via **File → Share → Publish to web → CSV**, not a standard share link
- `active` column comparison is case-insensitive (`TRUE`, `true`, `True` all treated as active)
- Card ordering within a Category → Thickness group: **sheet row order** (no client-side sort)
- Thickness grouping: free text, grouped by exact string match. Distinct thickness values within a category are presented in sheet order (first occurrence determines position)

## Hero Stats

Both stats computed from the fetched data (active rows only):
- **Item count**: number of rows where `active = TRUE`
- **Category count**: number of distinct `category` values present in active rows (not hardcoded)

## Error Handling

- Sheet fetch fails or parse error: hide the product grid, show inline message — "Unable to load inventory at this time. Please call Tomas at 416 788 1629."
- Item has no `image_url`: card shows `#1e2535` placeholder background, no `<img>` tag rendered
- Item has an `image_url` that returns 404 (e.g. expired Imgur link): `onerror` on the `<img>` swaps `src` to a data URI of a 1×1 transparent pixel and sets the card image background to `#1e2535`

---

## Mobile

Desktop-first. No responsive breakpoints for v1. Apply `min-width: 1024px` to a `.site-wrapper` div (not `body`) so the page scrolls horizontally on narrow screens rather than breaking the layout.

---

## Update Workflow

1. Upload photo to Imgur → copy direct image URL (e.g. `https://i.imgur.com/abc123.jpg`)
2. Open the Google Sheet → add, edit, or update a row
3. To hide a sold item: set the `active` column to `FALSE`
4. Site reflects changes automatically on next page load — no redeploy needed
5. **Important:** The sheet must remain published as CSV (File → Share → Publish to web). If unpublished, the site will show the error state.

---

## Out of Scope (v1)

- Shopping cart, checkout, pricing display
- User accounts or login
- Shipping or delivery
- Search or text filtering
- Mobile-optimized layout
