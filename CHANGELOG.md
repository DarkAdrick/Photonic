# Changelog

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
- [EDIT] Changelog refactored as separate file (CHANGELOG.md)
- [EDIT] Footer reordered: layout toggle left, zoom slider right
- [EDIT] CSS split into 15 component files (components/)
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
