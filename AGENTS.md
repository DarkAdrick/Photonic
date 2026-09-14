# AGENTS.md — Working memory for the opencode agent (Photonic)

**Language of communication: French** (the user writes in French; reply in French).

## The Photonic project
- Local photo viewer: grid + map (Leaflet) + detail, with a local Flask backend.
- **Desktop**: a **frameless** pywebview window (drag + controls + custom resize) loading `frontend/index.html`; EXE build via PyInstaller (`Photonic.spec`) on GitHub Actions.
- **Mobile**: Capacitor/Android, everything in `mobile/` (WIP, source-only, **never mentioned in the CHANGELOG** — user decision).
- Frontend: vanilla JS, no framework, in `frontend/`. Key structure:
  - `frontend/index.html` — single page. Version badge: `<span class="version-badge-inner">vX.Y.Z</span>` followed by a `<span class="version-badge-snapshot">SNAPSHOT</span>` pill on snapshot builds (remove the pill for a real release). Cache-busting `?v=X.Y.Z` on all `<script>`/`<link>`.
  - `frontend/js/modules/*.js` — modular version **also loaded**.
  - `frontend/css/style.css` — imports all components with `?v=X.Y.Z` (must be bumped too).
  - `frontend/i18n/{en-US,fr-FR,de-DE,es-ES,ja-JP}.json` — **every new key translated in all 5 files**. Validation: `ConvertFrom-Json`.

## Theme / colors state
- `THEME_PALETTES`: midnight, phoenix-dark, forest, **daylight**, phoenix-light, forest-light.
- **`DEFAULT_PALETTE = "daylight"`** (light theme). The `:root` in `base.css` holds the Daylight values.
- Reset colors / Reset all restore **Daylight** (not Midnight). The Daylight swatch is `active` by default when no palette is saved.
- Color input fallbacks = Daylight hex (e.g. `#F4F5FA`, `#2563EB`).

## Frameless window (desktop)
- `run.py`: `webview.create_window("Photonic", ..., width=1400, height=900, resizable=True, min_size=(450, 600), frameless=True, easy_drag=False, draggable=True, js_api=...)`.
- Custom resize: handles → `pywebview.api.resize_window(w, h, edge)`.


## Misc JS
- Locations layout: `setLocationsLayout("horizontal"|"vertical")`; on resize, clamp (map ≥ 200px, panel ≥ 130px, total = container); `savedHor` restored only if `map + panel >= 80%` of the width.
- Ctrl+scroll on `#photo-grid` AND `#map-photos` adjusts thumbnail size (`thumbMin=20`, max 450, default 150).

## GitHub — hard rules learned 2026-09-07
1. **All development on `main`**, never a separate dev branch. The `MobilePWA` branch was **deleted** (local + remote). Local checkout = `main`. Push with `git push origin HEAD:main` (fast-forward).
2. **Version numbers: SEQUENTIAL.** The latest release is the base. v1.1.2 → v1.1.3 → v1.1.4 (→ next: **v1.1.5**). **Never skip a number.** If the user proposes a skip, **warn them explicitly** before committing/tagging.
3. **Release procedure**:
   - `backend/version.py` → `APP_VERSION = "X.Y.Z"`.
   - `frontend/index.html`: badge `vX.Y.Z` **and** cache-busting `?v=X.Y.Z` (all occurrences); same for `frontend/css/style.css`.
   - `CHANGELOG.md`: top section `## vX.Y.Z — Name — DD Month YYYY` with subsections (`### Desktop`, `### Settings`, `### General`…), text in English.
   - Commit on main, **annotated** tag: `git tag -a vX.Y.Z -m "..."`, then `git push origin HEAD:main` and `git push origin vX.Y.Z`.
   - The tag push triggers `.github/workflows/release.yml` (~5 min): PyInstaller from the tag commit, then `softprops/action-gh-release` creates/updates the GitHub Release (auto notes = just the "Full Changelog" link) + uploads `Photonic-vX.Y.Z.exe`. **No `gh release create` or auth needed.**
4. **Re-generate an already published release (same version, more fixes)**: move the tag to the new commit (`git tag -d v1.1.4` → retag → `git push origin :refs/tags/v1.1.4` → `git push origin v1.1.4`). The workflow re-runs and `action-gh-release` **updates the existing release with the new EXE**. Deleting the release is not needed (and would require auth).
5. **GitHub "Latest" = the most RECENTLY published release**, not the highest version. v1.1.2 already overrode v1.1.3 (published 40s apart). Fix: Edit release → Update release (user action) — see also the `make_latest` option (auth API).
6. **`gh` is NOT authenticated on this machine** (`gh auth status` fails, no GH_TOKEN). Any authenticated API action (delete release, make_latest) requires the user to run `gh auth login`. Public API reads work via `Invoke-RestMethod` + `User-Agent` header.
7. **SmartScreen**: the "not commonly downloaded" warning only goes away with code signing. Paid: OV certificate (~150–300 €/year) or Microsoft Trusted Signing (~9 €/month + per-signature). Free: **SignPath Foundation** (OSI open-source projects, GitHub Actions integration). EXE reputation also accumulates through download volume.
8. **The user tests the EXE**: a code fix only reaches them after a release (the build starts from the tag commit).
9. Systematic checks:
   - `node --check <js>` after editing JS;
   - `ConvertFrom-Json` after editing i18n;
   - `git ls-remote --tags origin` / `git ls-remote origin refs/heads/main` to verify state;
   - API: `https://api.github.com/repos/DarkAdrick/Photonic/{releases,actions/runs}`.
10. **Check the last Build & Release run before announcing a release is ready** (status/conclusion + asset present).

## Rules of collaboration
- **NEVER commit or push unless the user explicitly says the word "commit" / "committe"** — asking "tu committe ?", proposing to commit, or building release files is NOT enough. Only an explicit, direct instruction unlocks a git commit.
- **Never skip a version number** (see GitHub rule 2).

## State at 2026-09-07 (end of day)
- `main` = last window-fix commit; tag `v1.1.4` moved onto it with Daylight + 450 clamp; build in progress/to be verified.
- Latest officially managed release: **v1.1.4**.