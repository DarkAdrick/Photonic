# Changelog

## v1.0.0 — 29 August 2026

### Internationalization (i18n)
- [ADD] The whole application UI is now translatable. A new `/i18n` static mount serves per-language dictionaries (`en-US.json`, `fr-FR.json`) and a global `window.I18n` engine loads them, resolves keys with `{placeholder}` substitution and falls back to the raw key (never a broken string) when a translation is missing
- [ADD] **English** (default) and **French** translations covering the header, filters drawer, sidebar, cleaning tabs, empty state, photo grid, stats, settings, dialogs (tag/collection/folder), detail panel, context menu, collections, confirmations, changelog and scan/status messages
- [ADD] Most static strings are wired through `data-i18n` / `data-i18n-title` / `data-i18n-placeholder` attributes, while dynamic strings go through a `t()` helper — local `t` variables that would shadow the helper were renamed (e.g. in `renderMetaBadges`, the detail tag loop and the settings tags loop)
- [ADD] Language is persisted to `localStorage` (`photonic.lang`) and mirrored to the backend `settings.json`, so the choice survives restarts and page reloads

### Language switcher
- [ADD] Flag dropdown in the header to switch language on the fly — the menu lists every language with its flag and native name, and applying a language re-renders the active settings card, the current view and the header in place
- [ADD] Language selector in Settings > Application > General ("Language"), kept in sync with the header dropdown
- [ADD] New backend endpoints `GET/POST /api/settings/language` to read and save the language in `settings.json`
- [ADD] Flags are bundled **SVG images** (`/i18n/flags/us.svg`, `/i18n/flags/fr.svg`) instead of emoji — emoji regional flags do not render inside WebView2 on Windows and showed up as a single stray glyph (`🇫`)

### General
- [EDIT] Cleaned up hard-coded English across settings (Updates/General/Display/Data cards, Tags/Collections/Folders management pages), stats charts, scan progress and selection bars — all now go through the translation layer

## v0.2.9 — 29 August 2026

### Locations (map)
- [ADD] A selection header now sits under the map resize handle, above the photo strip: it shows the current item count, the number of selected items and a Deselect All button (mirrors the main grid header)
- [ADD] "Only Selected" button in the selection headers (main grid and map strip): toggles a dynamic filter to show only the currently selected items; auto-disables when the selection is emptied, or with Escape
- [EDIT] Photo strip header count stays in sync with the current map view

### Settings
- [EDIT] The Display card is now split into `h4` subsections: **General** (thumbnail size, default view), **Locations** (cluster group size, disable clustering below) and **Appearance** (the former separate Appearance card was merged into Display)
- [ADD] Manual value input (editable number field) next to every slider — thumbnail size, cluster group size and disable clustering below — so an exact value (e.g. 500) can be typed instead of fighting a sensitive slider; slider and input stay in sync both ways
- [ADD] Orange visual warning when cluster settings exceed a safe value: **Cluster group size** > 100 and **Disable clustering below** > 1000 — shown in the setting description and on the numeric value

### Changelog & Credits
- [ADD] Scrolling credits panel in the changelog dialog: animated lists of **sponsors** (GitHub public sponsors + `credits.json`) and **contributors** (`thanks`), hidden when empty
- [ADD] New backend endpoint `/api/sponsors` that merges the bundled/overridable `credits.json` with public GitHub sponsors (anonymous donors never appear)
- [ADD] "What's new & Credits" button in Settings > Application to re-open the changelog with the credits drawer
- [ADD] Changelog now supports version group headers (`## v0.x`)
- [EDIT] README updated with one-time sponsorship tiers and how in-app credits are assembled

## v0.2.8 — 24 August 2026

### Packaged app (.exe)
- [FIX] Drag & drop of a photo (or selection) onto a sidebar tag/collection was dead in the .exe: pywebview injects a script that cancels any HTML5 drag starting on an `<img>`/`<a>` element (`draggable=False` default), and photo cards are dragged from their thumbnail — the window is now created with `draggable=True` and the grid's `dragstart` no longer bubbles to host-level handlers
- [EDIT] No change in the browser (dev) build: drag & drop was only broken inside the WebView2 window

## v0.2.7 — 23 August 2026

### Updates
- [FIX] Update check now survives GitHub API rate limits (HTTP 403 on shared IPs/VPN): it falls back to the public `releases.atom` feed, which has no rate limit
- [EDIT] Startup check no longer surfaces a spurious error when the API is temporarily unavailable

## v0.2.6 — 23 August 2026

### Packaged app (.exe)
- [FIX] Changelog modal showed "No changelog available." in the packaged app: CHANGELOG.md was never bundled and its path only resolved in dev — it is now embedded (next to `backend/`) and looked up via the new `backend.paths.resource_path()`
- [FIX] Same latent issue for `icon.png`, used as thumbnail fallback for broken videos: now bundled too

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

## v0.1.x

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
