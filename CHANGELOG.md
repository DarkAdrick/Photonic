# Changelog

## v0.2.5 — 23 August 2026

### CI / Releases
- [ADD] Automatic builds & releases via GitHub Actions: pushing a `v*` tag now builds `Photonic.exe` on a Windows runner and publishes it as a GitHub Release with auto-generated notes
- [ADD] Manual "Build & Release" workflow (Actions tab) to build the .exe on demand without publishing — downloadable as an artifact
- [EDIT] `Photonic.spec` is now tracked in git (removed from `.gitignore`) so CI builds use the exact same recipe as local builds
- [EDIT] Workflow recreates the `venv_build` environment so the embedded GeoNames CSV resolves identically on the runner

## v0.2.4 — 23 August 2026

### Desktop window (.exe)
- [FIX] Drag & drop inside the app no longer moves the whole window: the window is now moved only from the empty header area (double-click it to maximize/restore)
- [ADD] Window can be resized from all edges and corners, with native resize cursors (min 800×600)
- [ADD] Minimize / Maximize / Restore / Close buttons in the header — no more Alt+F4 needed

### Geolocation
- [FIX] Reverse geocoding is now fully offline in the .exe: the GeoNames database is embedded and never downloaded/written next to the executable
- [FIX] Fixed a resource exhaustion risk in the packaged app: reverse_geocoder multiprocess mode spawned one process tree per query under PyInstaller; single-process mode is now enforced via the new `backend/geo.py`

### Build
- [EDIT] #Build.bat hardened: detects a broken/moved venv and rebuilds it, installs dependencies via `python -m pip`, embeds `rg_cities1000.csv`, explicit error handling at each step
- [CLEANUP] Removed unused legacy `frontend/js/old.app.js`

## v0.2.3 — 23 August 2026

### Telemetry
- [ADD] Anonymous launch ping sent once at startup to the Phoenix Factory stats endpoint (install ID, app version and OS only — never any photo, path or personal data)
- [ADD] Opt-out toggle in Settings > Application > General ("Anonymous usage statistics"), persisted in `.photonic/settings.json`
- [ADD] Anonymous install ID generated on first launch and stored in `.photonic/data/install_id`
- [EDIT] PROJECT.MD §18 updated to document the ping; it remains non-intrusive and fully disableable

## v0.2.2 — 23 August 2026

### Updates
- [ADD] Update checker: Photonic now detects new releases published on GitHub (DarkAdrick/Photonic)
- [ADD] Automatic check at startup (background, never blocks launch) + manual "Check for updates" button in Settings > Application
- [ADD] "Update" pill in the header next to the version badge when a new version is available (click to open the release page)
- [ADD] Toast notification on startup when a new release is detected
- [ADD] New "Updates" card in Settings > Application with current status and direct link to the GitHub releases page
- [ADD] Version is now centralized in `backend/version.py` and synced across backend, header badge and settings

## v0.2.1 — 22 August 2026

### Photo Grid
- [ADD] Tag & collection count badges on photo cards (tiny pills, bottom-left above the filename, hidden when zero)
- [ADD] Filenames auto-hide below 90px thumbnails; meta badges stick to the card edge
- [EDIT] Video play badge and 360° badge now scale proportionally with thumbnail size
- [ADD] Zoom out / zoom in buttons around the size slider (+/- 20px steps, Ctrl+Scroll still works)
- [EDIT] Minimum thumbnail size lowered from 60px to 30px
- [EDIT] Counts and messages say "item(s)" instead of "photo(s)" across the UI

### Map / Locations
- [ADD] Photo strip now follows the global thumbnail zoom (was fixed 100px)
- [ADD] Progressive rendering of the geo photo strip in chunks of 80 cards via IntersectionObserver — instant display even with 20k+ geotagged items
- [ADD] Reusable loader component (`createLoader()`): animated spinning/pulsing aperture logo with optional label
- [ADD] Loader overlay on the map while photos load (appears only if the fetch exceeds 250ms)
- [EDIT] Map loads debounced at 400ms — rapid scroll-zoom triggers a single reload
- [EDIT] Skipped entirely when bounds/filters/search are unchanged (returning to the view no longer flashes the loader)
- [EDIT] Loader slides in smoothly from the top with a soft spring and slides back up on exit

### Drag & Drop
- [ADD] Drag any photo (or a whole multi-selection) onto a sidebar tag or collection to assign it
- [ADD] Bulk endpoints `POST /api/photos/bulk-tags` and `POST /api/photos/bulk-collections` (idempotent)
- [ADD] Drop targets highlight on hover, success toast on assignment, grid/sidebar refresh after drop

### Collections
- [FIX] Parent collections show aggregated item counts and preview thumbnails from their entire subtree in browse mode

### Theme
- [FIX] Context menu colors follow the active palette (hardcoded grays replaced by theme variables)

### Other
- [FIX] 14 `<label>` elements were missing their `for` attribute (filters drawer, tag dialog, collection dialog)
- [REMOVE] Herobrine

## v0.2.0 — 21 August 2026

### Folders
- [FIX] Folder view no longer shows photos from sibling folders with a shared name prefix (e.g. photos from `PHOTEST2` appearing in `PHOTEST`)
- [FIX] Phantom subfolder created from name remainder (e.g. a fake "2" folder for `PHOTEST2`)
- [FIX] Folder photo counts and samples now require a path separator boundary (folder list, browse view, photo grid, stats, map)
- [FIX] Rescanning a folder no longer matches sibling folders sharing a name prefix (could delete videos from `PHOTEST2` when rescanning `PHOTEST`)
- [FIX] SQL LIKE patterns escape `%`, `_` and `\` — folders with special characters are handled correctly

### Photo Grid
- [FIX] Thumbnail size changed via Ctrl+Scroll or slider is now persisted correctly (localStorage key mismatch caused reset to old value on reload)

### Tags
- [ADD] "New Tag" button in Settings > Tags with inline creation row (name + color, Enter to create)

### Appearance
- [ADD] New theme palettes: Phoenix Dark and Phoenix Light (fire/orange)
- [REMOVE] Sand palette
- [ADD] Palette picker grouped on two rows (Dark / Light) with labels
- [ADD] Palette swatches harmonized to equal width based on longest name
- [EDIT] Settings app info card (logo, title, glow) now follows the active palette colors instead of fixed brand gradient

### UI
- [ADD] Header settings button highlights while settings are open and closes settings on click (toggle)
- [EDIT] Header settings button restyled as a 34x34 rounded square matching the donate button
- [EDIT] Search box and Filters button height aligned with header buttons (34px)

## v0.1.2 — 20 August 2026

### Photo Detail
- [ADD] Interactive 360-degree equirectangular viewer using Pannellum (WebGL)
- [ADD] Automatically display 360 photos in 360-degree interactive mode by default
- [ADD] Dedicated 360-degree toggle button (Compass) in the action bar
- [ADD] High-resolution raw photo streaming endpoint (/api/photos/{id}/raw)

### Environment
- [FIX] Launch script (`#Launch.bat`) now automatically detects and uses the `venv_build` virtual environment if it exists, or automatically initializes it and installs all dependencies, preventing `ModuleNotFoundError: No module named 'uvicorn'`.

## v0.1.1 — 19 August 2026

### Photo Grid
- [ADD] Masonry layout mode (Pinterest-style waterfall)
- [ADD] Layout toggle button (Grid / Masonry)

### UI
- [ADD] Donate button in sidebar (→ GitHub Sponsors)
- [ADD] Version badge with animated gradient + wobble
- [ADD] Changelog modal with project hero
- [FIX] Version badge gradient too dark, now colorful and visible
- [FIX] Header height increased, logo and text scaled up
- [FIX] Stats charts bottom labels truncated
- [EDIT] Changelog refactored as separate file (CHANGELOG.md)
- [EDIT] Footer reordered: layout toggle left, zoom slider right
- [EDIT] CSS split into 15 component files (components/)
- [EDIT] Photonic gradient palette standardized with CSS variables
- [EDIT] Filter drawer and photo grid use darker gradient
- [REMOVE] Herobrine

## v0.1.0 — 19 August 2026

### Photo Library
- [ADD] Recursive folder scanning (background thread, async)
- [ADD] EXIF metadata extraction (camera, lens, GPS, date, aperture, ISO...)
- [ADD] Thumbnail generation (small 160px, medium 400px, large 1024px)
- [ADD] Image formats: JPEG, PNG, WebP, TIFF, BMP, GIF

### Search & Filters
- [ADD] Text search (filename, camera, lens)
- [ADD] Filter by camera, lens, date range, extension, rating
- [ADD] Filter by country, city, GPS status
- [ADD] Live search with debounce

### Photo Grid
- [ADD] CSS Grid with lazy loading
- [ADD] Adjustable thumbnail size (slider + Ctrl+Scroll)
- [ADD] Multi-selection with drag (Ctrl+Click, Shift+Click)

### Photo Detail
- [ADD] Full metadata view
- [ADD] Zoom / pan / rotate
- [ADD] Keyboard navigation (arrows, Escape)
- [ADD] Tag & rating management

### Tags
- [ADD] Create, color, assign, browse
- [ADD] Hierarchical tag system

### Countries
- [ADD] Auto-detect from GPS
- [ADD] Browse photos by country with flag

### Cameras
- [ADD] Browse photos grouped by camera model

### Map View
- [ADD] Leaflet.js + OpenStreetMap (no API key)
- [ADD] Marker clustering
- [ADD] Bbox filtering (markers refresh on map move)
- [ADD] Photo strip below map

### Cleaning
- [ADD] Duplicate detection (MD5 hash)
- [ADD] Blur analysis
- [ADD] Bad quality detection (black, white, over/underexposed)

### Stats
- [ADD] Format distribution (doughnut chart)
- [ADD] Photos over time (line chart)
- [ADD] Top countries (bar chart)

### UI
- [ADD] Dark theme (deep blue/purple + gradient accents)
- [ADD] SQLite WAL mode
- [ADD] Local-first, no cloud, no telemetry
