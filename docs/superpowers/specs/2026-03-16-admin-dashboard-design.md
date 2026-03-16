# FIRESALE RUBBER — Admin Dashboard Design Spec

**Date:** 2026-03-16
**Owner:** Tomas Giannini

---

## Overview

Add a local admin dashboard (`admin.html`) for managing inventory on the FIRESALE RUBBER site. Replace Google Sheets as the data source with Supabase — a free backend-as-a-service providing a PostgreSQL database and file storage. The main site (`index.html`) is updated to read from Supabase instead of a Google Sheets CSV.

**Admin dashboard runs locally only** — opened as a file in the browser on Tomas's laptop. No authentication required.

---

## Goals

- Upload photos directly (drag-and-drop or click) — no manual Imgur/URL steps
- Add, edit, and delete inventory items from a single page
- Changes appear on the live site within seconds of saving
- Free — Supabase free tier is sufficient

---

## Supabase Setup (one-time)

Create a free project at supabase.com. Two resources needed:

### Database table: `inventory`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `category` | text | One of: Puzzle Tiles, Rolls, Sheets, Acoustic |
| `thickness` | text | Free text, e.g. `3/4"` |
| `name` | text | Display name |
| `color` | text | Free text |
| `quantity` | text | Free text, e.g. `~200 sqft` |
| `notes` | text | Cosmetic issue description, nullable |
| `image_url` | text | Full public URL from Supabase Storage, nullable |
| `badge` | text | `Hot`, `Limited`, or empty string |
| `active` | boolean | true = visible on site, false = hidden |
| `created_at` | timestamptz | Auto-generated, used for default sort order |

Row-level security: **disabled**. This means the anon key grants full read and write access to anyone who has it. This is intentional and acceptable — the admin is local-only, the data is non-sensitive, and the tradeoff in simplicity is worth it for this project.

**Security note:** The anon key will be present in the deployed `app.js` on Vercel. With RLS disabled, this technically allows anyone to write to the database via the API. For a personal overstock gallery this is an accepted risk.

### Storage bucket: `product-images`

- Public bucket (images accessible via URL without auth)
- Accepts image files (jpg, jpeg, png, webp)
- Max file size: 5MB per image

### API credentials

Supabase provides two values used in both `admin.html` and `app.js`:
- `SUPABASE_URL` — project URL (e.g. `https://xxxx.supabase.co`)
- `SUPABASE_ANON_KEY` — public anon key, same key used in both files

Both are stored as constants at the top of each file.

---

## Admin Dashboard (`admin.html`)

A standalone local HTML file. Loaded via Supabase JS SDK from CDN — no build step, no server.

### Layout

```
┌─────────────────────────────────┐
│  FIRESALE RUBBER — Admin        │
├─────────────────────────────────┤
│  [Add / Edit Form]              │
│  - Photo upload area            │
│  - Category (dropdown)          │
│  - Thickness (text)             │
│  - Name (text)                  │
│  - Color (text)                 │
│  - Quantity (text)              │
│  - Notes (textarea)             │
│  - Badge (dropdown)             │
│  - Active (checkbox)            │
│  [Save Item] [Cancel]           │
├─────────────────────────────────┤
│  Current Inventory              │
│  [row] [row] [row] ...          │
│  Each row: photo thumb, name,   │
│  category, active status,       │
│  [Edit] [Delete]                │
└─────────────────────────────────┘
```

### Form behaviour

- **Add mode** (default): form is blank, Save creates a new row
- **Edit mode**: clicking Edit on a row pre-fills the form with that item's data. The item's `id` (uuid) is stored in a JS variable `editingId`. Save issues an UPDATE using that id. Cancel clears `editingId` and returns to Add mode.
- **Photo upload**: optional — items without photos are supported. Clicking the upload area or dragging a file uploads the image to Supabase Storage immediately and shows a preview. The resulting public URL is stored in the form state. If the item already has a photo and a new one is uploaded, the old photo is deleted from storage first (path derived from the existing `image_url` — see Storage path below).
- **Active checkbox**: checked = visible on live site, unchecked = hidden

### Storage path

Images are stored at path `{uuid}.{ext}` in the `product-images` bucket (e.g. `abc123.jpg`). The full public URL follows the pattern:
`https://{project}.supabase.co/storage/v1/object/public/product-images/{uuid}.{ext}`

To delete an image, the storage path is extracted by taking everything after `/product-images/` in the `image_url`. This extraction is done in a helper function `getStoragePath(imageUrl)`.

### Delete behaviour

Clicking Delete shows a browser `confirm()` dialog. On confirmation:
1. If the item has an `image_url`: delete the image from Supabase Storage using `getStoragePath(imageUrl)`. If this fails, show error and abort — do not delete the row.
2. Delete the row from the database. If this fails, show error (image is already deleted — user can re-upload if needed).

`image_url` is nullable — items with no photo skip step 1.

### Inventory list

- Fetched from Supabase on page load and after every save/delete
- Sorted by `created_at` descending (newest first — opposite of the public site, which shows oldest first so established items stay in place)
- Shows all items regardless of `active` status (unlike the public site which hides inactive)
- Inactive items shown with reduced opacity so they're visually distinct

### Error handling

- Upload fails: show inline error "Photo upload failed. Try again."
- Save fails: show inline error "Save failed. Check your connection."
- Delete fails: show inline error "Delete failed. Try again."
- Errors displayed below the form, cleared on next action

---

## Main Site Update (`app.js`)

Replace the Google Sheets CSV fetch with a Supabase query.

### Change summary

- Remove: PapaParse CDN script tag from `index.html`
- Add: Supabase JS SDK CDN script tag to `index.html`
- Replace: `fetchInventory()` in `app.js` — instead of `Papa.parse(url, ...)`, use Supabase JS client to query the `inventory` table where `active = true`, ordered by `created_at` ascending
- Data shape from Supabase matches existing column names — `renderCatalog`, `renderCard`, all rendering logic unchanged

### Query

```js
const { data, error } = await supabase
  .from('inventory')
  .select('*')
  .eq('active', true)
  .order('created_at', { ascending: true });
```

### Error handling

Same as before: if fetch fails, show "Unable to load inventory" message in catalog.

---

## What Does NOT Change

- `index.html` structure (header, banner, hero, filter tabs, contact strip, footer)
- `style.css` — no visual changes to the public site
- All rendering logic in `app.js` (grouping, filtering, card rendering, escaping)
- Vercel deployment — push to GitHub, auto-redeploys

---

## Out of Scope

- Authentication / login on admin page
- Mobile admin experience
- Bulk import / CSV upload
- Image resizing or optimization
- Multiple user accounts
