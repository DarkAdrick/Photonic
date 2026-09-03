# Changelog

## v1.1.1 — Responsive Update 📱 — 03 September 2026

### Mobile & tablet support
- [ADD] **Responsive layout** for tablets and phones: the sidebar becomes a **hamburger drawer** with a backdrop, centered at three breakpoints (≤1024px tablet landscape, ≤768px tablet portrait, ≤480px phone)
- [ADD] **Smart header on mobile**: the logo and action buttons stay on the first line (grouped on the right) while a full-width search bar sits below, with the **Filters** button right next to it
- [ADD] The photo grid adapts to small screens and a **mobile default thumbnail size** (110px) is used when no size has been saved
- [EDIT] The **Settings page opens full-screen** on mobile and hides the status bar instead of being squeezed into the bottom third
- [EDIT] The **Changelog modal is full-screen** on mobile: the changelog takes the top two thirds and the scrolling **Credits / Contributors** section fills the bottom third
- [FIX] Dialogs, context menus and toasts no longer overflow horizontally on narrow screens

### General
- [CHORE] Version bump to 1.1.1 and cache-busting bumped to match

## v1.1.0 Atlas — 02 September 2026

### Geolocation — Set Location 🗺️
- [ADD] **Set Location** dialog: a full searchable Leaflet map (OpenStreetMap) with a draggable marker to assign GPS coordinates to one or several photos. Enter a place to search and pan, or click anywhere on the map to drop the marker; coordinates update live. Geographic data is written back into the image **EXIF** (JPEG, WebP, PNG, TIFF) via `piexif` so it survives outside Photonic
- [ADD] Four entry points:
  - **Photo detail** — a "Set Location" pill next to the coordinates
  - **Context menu** — "Set Location…" on one or several selected photos
  - **Map view** — drag & drop photos from the grid/strip directly onto the map; the dialog opens pre-filled with the coordinates under the cursor
  - **"Remove location"** button to clear GPS from the photo(s) (file + database)
- [ADD] When coordinates are saved, reverse geocoding fills the **country and city** fields (matching Photos' own offline GeoNames lookup) so those photos appear in the Countries/Cities browse views and filters
- [ADD] Overwrite confirmation when one of the selected photos already has a location ("Replace?"), controllable in **Settings > Application > General** ("Confirm location overwrite")
- [ADD] New endpoints `GET /api/photos/location-status` and `POST /api/photos/set-location`

### Videos
- [ADD] **Video support is now first-class**: the new **Type** filter splits the library into **Images** and **Videos** (multi-select), and the Format filter lists only image formats when "Images" is on, video formats when "Videos" is on
- [ADD] GPS extraction from MP4/MOV metadata (QuickTime `©xyz`/`@xyz` atoms and Apple ISO-6709 strings) so scanned videos are geotagged and appear on the map — with low-memory streaming reads for very large files
- [ADD] Video GPS is reverse-geocoded to country/city and stored in the database (video files themselves do not get EXIF written)

### Filter rework
- [EDIT] Camera + Lens and Country + City are now **grouped popovers** with scrollable check lists instead of two large dropdowns; the Format filter becomes a popover combining the Type toggles and the extension list
- [ADD] **Chained filtering**: choosing a **Camera** filters the Lens list to the lenses used by that camera (camera → lenses), and choosing a **Country** filters the City list to that country's cities (country → city); the reverse direction intentionally does not filter the other list
- [ADD] Country filter rows show the **flag image + English country name** (checkbox keeps the ISO country code), and the active filter label uses the country name
- [ADD] Format and Device/Place chips show a concise label of the active selection
- [EDIT] Camera filter now matches the camera model **exactly** (was a fuzzy substring match), and accept comma-separated extension lists in `_ext_clause`

### Map / Locations
- [ADD] New **"not geolocalized"** mode (`geotag_only=0`): a toggle lets you show untagged photos on the map, not just geotagged ones
- [ADD] Photos placed on the map strip no longer stop at an empty footer — an explicit **"Nothing here"** empty state with an icon and hint
- [ADD] Map photo strip follows the global locale formatting for counters

### Clustering defaults
- [EDIT] Sane defaults so clustering behaves intuitively on first run: **Cluster group size** default 500 → **1**, and **Disable clustering below** default 5000 → **500** (existing users keep their saved values; only fresh installs and resets pick up the new defaults)

### Empty states
- [ADD] The welcome screen is now distinct from the **"No photos match your filters"** empty state: when a filter/search is active and nothing matches, you get a clear message and a **Reset Filters** button (which clears all filter chips, search and type toggles)

### Context menu & selection
- [ADD] **Select All** / **Deselect All** entries in the context menu (deselect only shows when something is selected; select only hides when everything visible is already selected)
- [ADD] **Set Location…** entry in the context menu
- [FIX] "Select"/"Deselect" single row now toggles based on whether the clicked photo is inside the current selection

### Grid & zoom
- [ADD] **Minimum thumbnail size lowered to 20px** and the grid **gap now adapts to zoom**: 2px at ≤ 20px thumbnails, 3px between 21–100px, and 6px above 100px
- [EDIT] Browse cards (folders, collections, tags, cameras, countries) use a **count badge** plus **color-tinted card accents** with auto-contrast text instead of the old plain count row

### Detail view
- [ADD] "View title" bar shows the current view name above the photo grid
- [ADD] "Set Location" pill in the location section of the photo detail panel
- [FIX] Detail map/coordinates sections now render consistently whether or not the photo has GPS

### Sidebar
- [EDIT] Sidebar actions (Add Folder / Rescan All) are **pinned to the bottom** with an independent scroll area above them — they no longer scroll out of view on long tag/collection lists
- [ADD] **Drag & drop on a collapsed sidebar section** (Folders / Collections / Tags) auto-expands it (and remembers it as open) so you can drop onto the revealed items

### Settings & misc
- [EDIT] Settings language menu is repositioned to the body so it is no longer clipped by the settings card's stacking context; stale menus are cleaned up when re-rendering
- [ADD] "Confirm location overwrite" toggle in Settings > Application > General (stored in `localStorage`)
- [CHORE] `piexif` added to dependencies for in-file GPS writing

## v1.0.3 Locale — 31 August 2026

### Photo detail view
- [FIX] The photo detail metadata is now translated: the labels (**File, Path, Size, Dimensions, Format, Camera, Lens, Focal Length, Aperture, Shutter Speed, Date Taken, Created, Modified**) previously hard-coded in English now go through the translation layer across all languages
- [FIX] The "Click to remove" tooltip on collection pills is translated too, and the rotation handlers that refresh the "Dimensions" row now match the translated label instead of the English one

### Localisation (dates & numbers)
- [FIX] Dates and times now follow the **selected language** instead of the browser/system locale: previously, whatever language the app was set to, dates still rendered in the system language (e.g. French "16 août 2026, 17:16:16") even when the UI was in English, German, Spanish or Japanese. They now use the active language's format (e.g. "Aug 16, 2026, 5:16:16 PM", "2026年8月16日 …"). This covers the photo detail metadata (Date Taken / Created / Modified) and the update-notice timestamps
- [FIX] Numbers (counters, statistics, scan progress and folder/country/tag/collection counts) are now formatted with the active language's grouping separators via the same locale, instead of the browser default

## v1.0.2 Ghost — 31 August 2026

### Hidden photos
- [ADD] The "Hidden" filter is now a **3-state selector** (Not hidden / Hidden / Only hidden) replacing the previous boolean checkbox — the first state (default) excludes hidden photos, the last shows only hidden ones
- [ADD] Hidden photos get a **distinct visual treatment**: the thumbnail is dimmed/desaturated, an eye-off overlay with diagonal hatching, an icon and a "Hidden" label is drawn on the card, and the card's file-name label keeps its normal text on an accent-colored background
- [ADD] Hidden photos are excluded by default from every view (grid, browse folders/collections/tags/cameras/countries, map, stats and filters) and can be re-included per-session with the new filter
- [ADD] New option in **Settings > Display > General**: "Show hidden photos by default" — when enabled the app starts with hidden photos visible instead of excluded (default: off)

### Hide / Show toggling
- [FIX] The "Hide"/"Show" action (context menu and the **H** shortcut) no longer depends on the active hidden filter — it now acts on the **actual state of the selected photos**: right-click on a hidden photo offers "Show", on a visible one "Hide"
- [ADD] With a **mixed selection** (both hidden and visible photos) the context menu shows **both** "Hide" and "Show" options; the **H** shortcut defaults to hiding whenever at least one selected photo is not hidden (and shows them only when all are hidden)

### Drag & drop
- [ADD] When dragging several photos (a multi-selection) toward a tag, collection or other drop target, a **custom drag ghost** follows the cursor: the dragged photo thumbnail with a count badge (`+N`) representing the remaining selected photos

### Selection
- [FIX] The selection visual markers no longer disappear when switching views (e.g. Library → Collections → Library): the counter stayed (e.g. "28 selected") but the freshly re-rendered cards were not highlighted — `renderSelection()` is now re-applied after each grid/browse re-render (library grid, folders and collections browse), so the highlighted `selected` state stays in sync with the count in every view

### Last view on startup
- [ADD] The app now **remembers the last active view and restores it on restart/F5**: the sidebar view (Library, Folders, Collections, Countries, Tags, Cameras, Locations, Cleaning, Stats) plus its navigation context (folder/collection path, tag, country, camera) and the Settings page (pane + section) are persisted to `localStorage` and reapplied automatically
- [FIX] The restore is applied **synchronously at boot** (before translations resolve) so the previous view is shown immediately — this removes the brief "default Library" flash at startup and, for the **Localisation** view, the momentary coexistence of the photo grid with the map / map-photo strip

### Packaged app
- [ADD] Local and GitHub-built executables are now named with the app version, e.g. **`Photonic-v1.0.2.exe`** — the version is read from the single source of truth `backend/version.py` (local `#Build.bat` and the `Photonic.spec`/GitHub release workflow both use it), so the asset name always matches the running app version

### Statistics
- [EDIT] The **"Photos over time"** timeline chart now comes **first** in the Statistics view (before Formats and Top Countries), keeping its full-width layout while the doughnut and bar charts sit side by side below it
- [FIX] The Statistics view now re-renders in the current language when you switch language from the header — previously it fell through to the main view and kept the old translated labels until you left and reopened the tab

### Changelog & Credits
- [ADD] The changelog **hero** (author line "Crafted by", the developer description and the "Sponsor this project" button) is now translated across all languages, alongside the existing title / credits / contributors headings

## v1.0.1 Polyglot — 29 August 2026

### Internationalization (i18n)
- [ADD] **German** (Deutsch), **Spanish** (Español) and **Japanese** (日本語) translations covering the whole UI — header, filters, sidebar, cleaning, stats, settings (Application/General/Display/Data, Tags/Collections/Folders pages), dialogs, detail panel, context menu, confirmations, changelog, scan/status messages and update notices
- [ADD] Language switcher (header dropdown and Settings > Application > General) now lists the new languages with their flags (`de.svg`, `es.svg`, `jp.svg`)

## v1.0.0 Modular — 29 August 2026

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

### Code structure & bug fixes
- [EDIT] Frontend refactored into modular files under `js/modules/` (one file per concern: grid, browse, map, detail, settings, events, i18n, …) sharing a single `window.PhotoApp` namespace (`P`) for state and `P.fn` for cross-module functions
- [FIX] Fixed several "is not defined" runtime errors introduced by the modular split, where module code referenced bare global names instead of the `P.` namespaced state: `renderMetaBadges`, `folderBrowsePath`, `collectionBrowsePath`, `activeCameraBrowseId`, `detailPanX/Y`, `detailRotation`, `detailThumbVersion`, `detailIndex`, `currentPhotoIds`, `describeUpdateState`, `lastUpdateState` and `RELEASES_PAGE` — these now correctly read/write `P.*` / `P.fn.*`
- [FIX] Settings > Application > General "Language" selector was broken (a button filled with `<option>` elements and a `change` handler that could not fire): it now opens a proper flag dropdown mirroring the header one, shows the current language as flag + name, and picks among the available translations

## v0.2.9 Kudos — 29 August 2026

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

## v0.2.8 Release — 24 August 2026

### Packaged app (.exe)
- [FIX] Drag & drop of a photo (or selection) onto a sidebar tag/collection was dead in the .exe: pywebview injects a script that cancels any HTML5 drag starting on an `<img>`/`<a>` element (`draggable=False` default), and photo cards are dragged from their thumbnail — the window is now created with `draggable=True` and the grid's `dragstart` no longer bubbles to host-level handlers
- [EDIT] No change in the browser (dev) build: drag & drop was only broken inside the WebView2 window

## v0.2.7 Refresh — 23 August 2026

### Updates
- [FIX] Update check now survives GitHub API rate limits (HTTP 403 on shared IPs/VPN): it falls back to the public `releases.atom` feed, which has no rate limit
- [EDIT] Startup check no longer surfaces a spurious error when the API is temporarily unavailable

## v0.2.6 Bundle — 23 August 2026

### Packaged app (.exe)
- [FIX] Changelog modal showed "No changelog available." in the packaged app: CHANGELOG.md was never bundled and its path only resolved in dev — it is now embedded (next to `backend/`) and looked up via the new `backend.paths.resource_path()`
- [FIX] Same latent issue for `icon.png`, used as thumbnail fallback for broken videos: now bundled too

## v0.2.5 CI — 23 August 2026

### CI / Releases
- [ADD] Automatic builds & releases via GitHub Actions: pushing a `v*` tag now builds `Photonic.exe` on a Windows runner and publishes it as a GitHub Release with auto-generated notes
- [ADD] Manual "Build & Release" workflow (Actions tab) to build the .exe on demand without publishing — downloadable as an artifact
- [EDIT] `Photonic.spec` is now tracked in git (removed from `.gitignore`) so CI builds use the exact same recipe as local builds
- [EDIT] Workflow recreates the `venv_build` environment so the embedded GeoNames CSV resolves identically on the runner

## v0.2.4 Framework — 23 August 2026

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

## v0.2.3 Signal — 23 August 2026

### Telemetry
- [ADD] Anonymous launch ping sent once at startup to the Phoenix Factory stats endpoint (install ID, app version and OS only — never any photo, path or personal data)
- [ADD] Opt-out toggle in Settings > Application > General ("Anonymous usage statistics"), persisted in `.photonic/settings.json`
- [ADD] Anonymous install ID generated on first launch and stored in `.photonic/data/install_id`
- [EDIT] PROJECT.MD §18 updated to document the ping; it remains non-intrusive and fully disableable

## v0.2.2 Update — 23 August 2026

### Updates
- [ADD] Update checker: Photonic now detects new releases published on GitHub (DarkAdrick/Photonic)
- [ADD] Automatic check at startup (background, never blocks launch) + manual "Check for updates" button in Settings > Application
- [ADD] "Update" pill in the header next to the version badge when a new version is available (click to open the release page)
- [ADD] Toast notification on startup when a new release is detected
- [ADD] New "Updates" card in Settings > Application with current status and direct link to the GitHub releases page
- [ADD] Version is now centralized in `backend/version.py` and synced across backend, header badge and settings

## v0.2.1 Grid — 22 August 2026

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

## v0.2.0 Folders — 21 August 2026

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

## v0.1.2 360 — 20 August 2026

### Photo Detail
- [ADD] Interactive 360-degree equirectangular viewer using Pannellum (WebGL)
- [ADD] Automatically display 360 photos in 360-degree interactive mode by default
- [ADD] Dedicated 360-degree toggle button (Compass) in the action bar
- [ADD] High-resolution raw photo streaming endpoint (/api/photos/{id}/raw)

### Environment
- [FIX] Launch script (`#Launch.bat`) now automatically detects and uses the `venv_build` virtual environment if it exists, or automatically initializes it and installs all dependencies, preventing `ModuleNotFoundError: No module named 'uvicorn'`.

## v0.1.1 Masonry — 19 August 2026

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

## v0.1.0 Genesis — 19 August 2026

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
