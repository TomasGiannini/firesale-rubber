# FIRESALE RUBBER — Project Retrospective

## What We Built

A live inventory catalog website for overstock rubber gym flooring at Pliteq. The site lets potential buyers browse available inventory organized by product type and thickness, view product photos in a lightbox, and call to inquire. An admin dashboard allows inventory management — adding, editing, and deleting items with multi-photo uploads — with changes appearing on the public site in real time.

**Live site:** https://firesale-rubber.vercel.app
**Admin dashboard:** https://firesale-rubber.vercel.app/admin.html
**Source code:** https://github.com/TomasGiannini/firesale-rubber

---

## The Problem

Pliteq had overstock rubber gym flooring sitting in a warehouse in Vaughan, Ontario — brand new product with minor cosmetic variations, available at clearance pricing. There was no easy way to showcase what was available to potential buyers. The initial idea was a simple way to list inventory without building a full e-commerce platform (no pricing on the site, no cart — buyers call to negotiate).

---

## Tech Stack & Why Each Piece Was Chosen

| Tool | Role | Why |
|------|------|-----|
| **Claude Code (AI assistant)** | Wrote all code, debugged issues, deployed | Entire project built through conversation — no manual coding |
| **HTML / CSS / JavaScript** | Frontend (no framework) | Simple, fast, zero build step — just static files |
| **Supabase** | Database (PostgreSQL) + image storage | Free tier, instant API, handles auth and storage in one place |
| **Vercel** | Hosting + serverless functions | Auto-deploys on git push, free tier, serverless for image conversion |
| **GitHub** | Source control | Connects to Vercel for automatic deployments |
| **heic-convert (Node.js library)** | HEIC to JPEG conversion | Server-side image format conversion for iPhone photos |

---

## How It Works

### Public Site
- Fetches active inventory from Supabase on page load
- Groups items by category (Puzzle Tiles, Rolls, Sheets, Acoustic Underlayment), then by thickness (sorted smallest to largest)
- Product cards show thumbnail, name, color, size, quantity, and cosmetic notes
- Clicking a card opens a lightbox with all photos, full details, and a call-to-action
- Filter tabs let you view one category at a time
- Fully responsive — works on desktop, tablet, and mobile

### Admin Dashboard
- Add/edit/delete inventory items through a web form
- Upload multiple photos per product (with drag or file picker)
- HEIC photos from iPhone automatically converted to JPEG
- Toggle items visible/hidden without deleting them
- Changes reflect on the public site immediately

### Architecture Flow
```
iPhone photo → Admin Dashboard → Supabase Storage (temp HEIC)
    → Vercel Serverless Function (converts to JPEG)
    → Supabase Storage (final JPEG)
    → Supabase Database (item record with image URLs)
    → Public site fetches and displays
```

---

## The Build Journey

### Phase 1: Initial Concept
Started with the idea of a simple catalog site. The very first approach used a **Google Sheets CSV** as the data source — the plan was to manage inventory in a spreadsheet and have the site read from it. This was scrapped in favor of Supabase for a more robust solution with proper image storage and a real database.

### Phase 2: Database & Basic Site
- Set up Supabase project with a PostgreSQL `inventory` table
- Built the public-facing catalog with category sections and product cards
- Created a shared `config.js` for Supabase credentials (used by both the public site and admin dashboard)
- Designed the visual identity: dark navy background with gold accents, bold athletic aesthetic

### Phase 3: Admin Dashboard
- Built a full admin interface for managing inventory
- Form with fields for category, thickness, name, color, quantity, badge, cosmetic notes
- Upload area for product photos
- Inventory list table showing all items with edit/delete actions
- Active/hidden toggle for each item

### Phase 4: Deployment & First Real Bugs
- Deployed to Vercel via GitHub — auto-deploys on every push to main
- Discovered the site didn't work when opened as a local file (`file://` protocol) — Safari blocks network requests from local files
- Solution: hosted everything on Vercel, including the admin dashboard

### Phase 5: The Great Debugging Session
This is where the real challenges began. The admin dashboard appeared to load but nothing actually worked — uploads failed silently, inventory showed "Loading..." forever, saves did nothing.

**Root cause discovery was a multi-step process:**

1. **`const` vs `window` properties** — Supabase credentials were defined with `const` in `config.js`. The startup check used `window.SUPABASE_URL` which is always `undefined` for `const` declarations (they don't create window properties). Fixed by using `typeof SUPABASE_URL === 'undefined'` instead.

2. **Browser caching** — After fixing code, the browser kept serving old cached JavaScript. Added `?v=N` cache-busting query parameters to all script tags and set no-cache headers in `vercel.json`.

3. **The main bug: variable name collision** — The Supabase CDN SDK creates a global `window.supabase` variable. The code had `const supabase = window.supabase.createClient(...)` which threw `Identifier 'supabase' has already been declared`. This single error silently broke the entire page. **Fix: renamed to `const sb = ...` throughout both admin.js and app.js.** This was the hardest bug to find because the error wasn't obvious without checking the browser console.

### Phase 6: Multi-Photo Upload
- Changed from single image upload to multiple images per product
- Stored image URLs as a JSON array string in the existing `image_url` text column — no database schema change needed
- Built `parseImageUrls()` helper that handles both JSON arrays and legacy single-URL strings for backward compatibility
- Added photo preview thumbnails with individual remove buttons in the admin form

### Phase 7: HEIC Image Support (The Longest Battle)
iPhone cameras save photos in HEIC format by default. Getting these to work was a multi-attempt process:

**Attempt 1: heic2any library (client-side)**
- JavaScript library that converts HEIC to JPEG in the browser
- Failed with "Could not parse HEIF file" — the bundled libheif lacks the HEVC decoder needed for iPhone photos

**Attempt 2: Canvas API (client-side)**
- Load the image into a Canvas element and export as JPEG
- Works in Safari (which supports HEIC natively) but fails in Chrome (can't load HEIC at all)
- Not a cross-browser solution

**Attempt 3: sharp library (Vercel serverless function)**
- Powerful Node.js image processing library
- Failed on Vercel: "No decoding plugin installed for this compression format" — Vercel's environment doesn't include the HEVC codec

**Attempt 4: heic-convert library (Vercel serverless function) — SUCCESS**
- Pure JavaScript HEIC decoder, no native dependencies
- v2.x was ESM-only which broke Vercel's CommonJS `require()` — had to pin to v1.x
- Finally worked reliably

**Attempt 5: 413 Content Too Large**
- Even after conversion worked, large iPhone photos (>4.5MB) hit Vercel's serverless function body size limit on the free plan
- **Solution: two-step upload** — upload the raw HEIC to Supabase Storage first (no size limit), send the storage URL to the serverless function (tiny JSON body), function downloads from storage, converts, and returns the JPEG. Temp HEIC file cleaned up automatically.

### Phase 8: Lightbox & Mobile Responsiveness
- Added click-to-view lightbox overlay with all product images, details, and "Call Tomas" CTA
- Close on X button, overlay click, or Escape key
- Built responsive design with three breakpoints (900px, 700px, 400px)
- Fixed mobile lightbox: images were hidden off-screen with horizontal scroll — changed to vertical stacking on mobile
- Added `overflow-y: auto` to lightbox content so all images are scrollable

### Phase 9: Refinements
- Made all admin form fields optional (no required validation)
- Added "Size" field for roll/puzzle dimensions (e.g., 24"x24", 4'x25')
- Changed thickness from free text to numeric input (mm only), with auto-formatting on display
- Sorted thickness groups smallest to largest within each category
- Delete button fix: inline `onclick` with JSON image URLs produced quotes that broke HTML attributes — changed `deleteItem()` to fetch URLs from database instead

### Phase 10: Image Loading Performance
- Attempted Supabase's image transformation API (`/render/image/`) to serve resized thumbnails on the fly
- Images came back zoomed in and terrible quality on Safari mobile — feature requires Supabase Pro plan
- Reverted to serving original images with `loading="lazy"` for below-the-fold optimization

---

## Key Challenges & Lessons Learned

### 1. The `const` Global Variable Trap
JavaScript `const` declarations in a script don't become `window` properties. This seems minor but caused silent failures that were hard to trace. The Supabase SDK also claims the global `supabase` name, making `const supabase = ...` a collision.

### 2. Browser Caching During Development
Deploying fixes that don't take effect because the browser serves cached JS is incredibly frustrating. Cache-busting version parameters (`?v=N`) on script tags solved this permanently.

### 3. HEIC is Harder Than It Looks
iPhone photos in HEIC format seem like a simple conversion problem, but browser support is inconsistent, many server-side libraries lack the codec, and file sizes hit platform limits. The final solution required four failed attempts and a creative two-step upload architecture.

### 4. Platform Limits Are Real
Vercel's free tier has a hard 4.5MB request body limit for serverless functions. You can't configure around it. The workaround (upload to storage first, pass the URL) is more complex but works reliably regardless of file size.

### 5. Mobile Testing is Essential
Multiple issues only appeared on mobile: images not showing in lightbox, lightbox not scrollable, image transforms looking terrible on Safari. Desktop testing alone missed all of these.

---

## Project Stats

- **Built entirely through AI pair programming** using Claude Code
- **Zero manual coding** — every line written through natural conversation
- **Tech stack cost: $0** — all services on free tiers (Supabase, Vercel, GitHub)
- **Time from idea to live site:** Single collaborative session
- **Deployment:** Automatic via GitHub → Vercel pipeline (push to main = live in ~30 seconds)

---

## What the AI Did vs. What the Human Did

**AI (Claude Code):**
- Wrote all HTML, CSS, and JavaScript
- Designed the database schema
- Built the admin dashboard and public site
- Debugged every issue (variable collisions, HEIC conversion, 413 errors, mobile layout)
- Managed git commits and deployments
- Iterated on design based on feedback

**Human (Tomas):**
- Defined the product and requirements
- Made all design decisions (colors, layout, what info to show)
- Tested on real devices (iPhone, desktop)
- Reported bugs with console errors and screenshots
- Uploaded actual inventory content
- Directed priorities and feature scope

---

## Final Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   Public Site    │     │  Admin Dashboard  │
│   (index.html)  │     │   (admin.html)    │
│                 │     │                   │
│  Browse catalog │     │  Add/edit items   │
│  View lightbox  │     │  Upload photos    │
│  Filter by type │     │  Toggle visibility│
└────────┬────────┘     └────────┬──────────┘
         │                       │
         │    Supabase JS SDK    │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │       Supabase        │
         │  ┌─────────────────┐  │
         │  │   PostgreSQL    │  │
         │  │ (inventory tbl) │  │
         │  └─────────────────┘  │
         │  ┌─────────────────┐  │
         │  │    Storage      │  │
         │  │ (product-images)│  │
         │  └─────────────────┘  │
         └───────────────────────┘
                     │
         ┌───────────┴───────────┐
         │   Vercel Serverless   │
         │   /api/convert.js     │
         │  (HEIC → JPEG)        │
         └───────────────────────┘
```

---

*Document created March 2026 for LinkedIn content reference.*
