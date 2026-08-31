(() => {
    const t = window.I18n ? I18n.t.bind(I18n) : (k, p) => String(k);
    const statusText      = document.getElementById("status-text");
    const scanProgress    = document.getElementById("scan-progress");
    const scanFill        = document.getElementById("scan-fill");
    const scanStatus      = document.getElementById("scan-status");
    const photoCountH     = document.getElementById("photo-count-header");
    const emptyState      = document.getElementById("empty-state");
    const photoGrid       = document.getElementById("photo-grid");
    const selectionBarEl  = document.getElementById("header-photo-grid");
    const breadcrumbBar   = document.getElementById("breadcrumb-bar");
    const mapView         = document.getElementById("map-view");
    const mapPhotosHeader = document.getElementById("map-photos-header");
    const mapPhotoCount   = document.getElementById("map-photo-count");
    const mapSelectionCount = document.getElementById("map-selection-count");
    const mapBtnDeselectAll = document.getElementById("map-btn-deselect-all");
    const mapBtnSelectedOnly = document.getElementById("map-btn-selected-only");
    const mapPhotos       = document.getElementById("map-photos");
    const btnAddFolder    = document.getElementById("btn-add-folder");
    const btnAddFolderSb  = document.getElementById("btn-add-folder-sidebar");
    const btnRescan       = document.getElementById("btn-rescan");
    const btnScanCancel   = document.getElementById("btn-scan-cancel");
    const dialog          = document.getElementById("folder-dialog");
    const folderInput     = document.getElementById("folder-path");
    const btnOk           = document.getElementById("btn-dialog-ok");
    const btnCancel       = document.getElementById("btn-dialog-cancel");
    const sidebarFilters  = document.getElementById("sidebar-filters");
    const searchInput     = document.getElementById("search");
    const filterDrawer    = document.getElementById("filter-drawer");
    const btnToggleFilters= document.getElementById("btn-toggle-filters");
    const filterCamera    = document.getElementById("filter-camera");
    const filterLens      = document.getElementById("filter-lens");
    const filterExt       = document.getElementById("filter-ext");
    const filterDateFrom  = document.getElementById("filter-date-from");
    const filterDateTo    = document.getElementById("filter-date-to");
    const filterRating    = document.getElementById("filter-rating");
    const filterCountry   = document.getElementById("filter-country");
    const filterCity      = document.getElementById("filter-city");
    const filterGeo       = document.getElementById("filter-geo");
    const filter360       = document.getElementById("filter-360");
    const btnClearFilters = document.getElementById("btn-clear-filters");
    const navItems        = document.querySelectorAll("#sidebar nav li");

    const detailOverlay = document.getElementById("photo-detail");
    const detailImg     = document.getElementById("detail-img");
    const detailFname   = document.getElementById("detail-filename");
    const detailMeta    = document.getElementById("detail-meta");
    const detailMapSec  = document.getElementById("detail-map-section");
    const detailCoords  = document.getElementById("detail-coords");
    const detailCollections = document.getElementById("detail-collections");
    const detailTags    = document.getElementById("detail-tags");
    const detailRating  = document.getElementById("detail-rating");
    const detailCounter = document.getElementById("detail-counter");
    const detailClose   = document.getElementById("detail-close");
    const detailPrev    = document.getElementById("detail-prev");
    const detailNext    = document.getElementById("detail-next");
    const detailRotateCW  = document.getElementById("detail-rotate-cw");
    const detailRotateCCW = document.getElementById("detail-rotate-ccw");
    const detailStage     = document.getElementById("detail-stage");
    const detailZoomSlider = document.getElementById("detail-zoom");
    const detailZoomLabel  = document.getElementById("detail-zoom-label");
    const detail360Btn     = document.getElementById("detail-360");
    const detail360Viewer  = document.getElementById("detail-360-viewer");
    const detailVideo      = document.getElementById("detail-video");
    const detailFooterCenter = document.querySelector(".detail-footer-center");
    const detailFooterRight  = document.querySelector(".detail-footer-right");
    const detailFullscreenBtn = document.getElementById("detail-fullscreen-btn");

    const mapResize    = document.getElementById("map-resize");
    const contextMenu  = document.getElementById("context-menu");

    const tagDialog      = document.getElementById("tag-dialog");
    const tagDialogTitle = document.getElementById("tag-dialog-title");
    const tagInput       = document.getElementById("tag-input");
    const tagColorPalette= document.getElementById("tag-color-palette");
    const tagColorPicker = document.getElementById("tag-color-picker");
    const tagColorHex    = document.getElementById("tag-color-hex");
    const tagExistingList= document.getElementById("tag-existing-list");
    const tagDialogOk    = document.getElementById("tag-dialog-ok");
    const tagDialogCancel= document.getElementById("tag-dialog-cancel");

    const collectionDialog      = document.getElementById("collection-dialog");
    const collectionDialogTitle = document.getElementById("collection-dialog-title");
    const collectionInput       = document.getElementById("collection-input");
    const collectionIconInput   = document.getElementById("collection-icon-input");
    const collectionIconPicker  = document.getElementById("collection-icon-picker");
    const collectionIconSelected= document.getElementById("collection-icon-selected");
    const collectionParentSelect= document.getElementById("collection-parent-select");
    const collectionColorPalette= document.getElementById("collection-color-palette");
    const collectionColorPicker = document.getElementById("collection-color-picker");
    const collectionColorHex    = document.getElementById("collection-color-hex");
    const collectionDialogOk    = document.getElementById("collection-dialog-ok");
    const collectionDialogCancel= document.getElementById("collection-dialog-cancel");

    const collectionExistingList    = document.getElementById("collection-existing-list");
    const collectionExistingSection = document.getElementById("collection-existing-section");

    let tagModalPhotoId = null;
    let tagModalBatchIds = null;
    let tagModalSelectedColor = null;
    let tagModalExistingTags = [];

    let collectionModalPhotoId = null;
    let collectionModalBatchIds = null;
    let collectionModalSelectedColor = null;
    let pendingCollectionAssignIds = null;
    let collectionModalExistingCollections = [];

    const confirmDialog = document.getElementById("confirm-dialog");
    const confirmTitle  = document.getElementById("confirm-title");
    const confirmMsg    = document.getElementById("confirm-message");
    const confirmOk     = document.getElementById("confirm-ok");
    const confirmCancel = document.getElementById("confirm-cancel");
    let confirmResolve = null;

    function showConfirm(title, message, okText) {
        if (localStorage.getItem("photonic.confirmDelete") === "false") return Promise.resolve(true);
        confirmTitle.textContent = title;
        confirmMsg.textContent = message;
        confirmOk.textContent = okText || "Delete";
        confirmDialog.classList.remove("hidden");
        return new Promise(resolve => { confirmResolve = resolve; });
    }
    confirmOk.addEventListener("click", () => { confirmDialog.classList.add("hidden"); if (confirmResolve) confirmResolve(true); });
    confirmCancel.addEventListener("click", () => { confirmDialog.classList.add("hidden"); if (confirmResolve) confirmResolve(false); });
    document.getElementById("confirm-dialog-close").addEventListener("click", () => confirmCancel.click());
    confirmDialog.addEventListener("click", (e) => { if (e.target === confirmDialog) { confirmDialog.classList.add("hidden"); if (confirmResolve) confirmResolve(false); } });

    const cleaningToolbar = document.getElementById("cleaning-toolbar");
    const cleaningTabs    = document.querySelectorAll(".cleaning-tab");
    const btnAnalyze      = document.getElementById("btn-analyze");
    const cleaningStatus  = document.getElementById("cleaning-status");
    const statsView       = document.getElementById("stats-view");

    let activeFolderId = null;
    let activeCollectionId = null;
    let activeTagId = null;
    let activeTagBrowseId = null;
    let activeCameraBrowseId = null;
    let activeCountryCode = null;
    let activeView = "library";
    let cleaningTab = "duplicates";
    let selectedIds = new Set();
    let folderBrowsePath = [];
    let collectionBrowsePath = [];

    const TAG_COLORS = [
        "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
        "#3498db", "#9b59b6", "#e84393", "#fd79a8", "#00cec9",
        "#6c5ce7", "#a29bfe", "#ffeaa7", "#fab1a0", "#74b9ff",
        "#55efc4", "#dfe6e9", "#636e72", "#b2bec3", "#2d3436",
    ];
    let scanPollCount = 0;
    let scanPolling = false;
    let lastScanRefresh = 0;
    let searchTimeout = null;
    let mapMoveTimeout = null;
    let map = null;
    let clusterGroup = null;
    let plainGroup = null;
    let currentPage = 1;
    let loadingMore = false;
    let hasMore = true;
    let currentPhotoIds = [];

    function clearGrid() {
        photoGrid.querySelectorAll(".photo-card, .country-card, .cleaning-separator").forEach(el => el.remove());
    }
    let detailIndex = 0;
    let detailMap = null;
    let detailRotation = 0;
    let detailZoom = 100;
    let detailPanX = 0;
    let detailPanY = 0;
    let detailDragging = false;
    let detailDragStartX = 0;
    let detailDragStartY = 0;
    let detailCurrentPhotoId = null;
    let detailCurrentPhotoData = null;
    let detailThumbVersion = 0;
    let pannellumViewer = null;
    let is360Mode = false;
    let isCurrentPhoto360Video = false;
    let video360Canvas = null;
    let video360Video = null;
    let video360Raf = null;
    let video360Yaw = 0;
    let video360Pitch = 0;
    let video360Fov = 75;
    let video360Dragging = false;
    let video360LastX = 0;
    let video360LastY = 0;

    let lastSelectedId = null;
    let isDragging = false;
    let dragStartId = null;
    let dragMode = "select";
    let dragHighlightIds = new Set();
    let contextMenuPhotoId = null;
    let dndPhotoIds = [];

    async function api(method, path, body) {
        const opts = { method, headers: { "Content-Type": "application/json" } };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(path, opts);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) { console.error("API non-JSON:", res.status, path); return {}; }
        return res.json();
    }

    function is360Photo(data) {
        if (!data.width || !data.height) return false;
        const camera = data.camera_model || data.camera || "";
        const make = data.camera_make || "";
        const isTheta = camera.toUpperCase().includes("THETA") || make.toUpperCase().includes("THETA");
        const isInsta360 = camera.toUpperCase().includes("INSTA360") || make.toUpperCase().includes("INSTA360");
        const isGoPro = (camera.toUpperCase().includes("GOPRO") && camera.toUpperCase().includes("MAX")) || (make.toUpperCase().includes("GOPRO") && camera.toUpperCase().includes("MAX"));
        const isRatio2to1 = Math.abs((data.width / data.height) - 2.0) < 0.05;
        return isTheta || isInsta360 || isGoPro || isRatio2to1;
    }

    function isVideo(p) {
        if (!p.extension && !p.filename) return false;
        const ext = (p.extension || p.filename.split('.').pop()).toLowerCase();
        const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", "mp4", "mov", "avi", "mkv", "webm"];
        return videoExts.includes(ext) || videoExts.includes("." + ext);
    }

    function is360Video(p) {
        return isVideo(p) && is360Photo(p);
    }

    function createLoader(label) {
        const el = document.createElement("div");
        el.className = "app-loader";
        el.innerHTML =
            '<div class="app-loader-icon">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="10"></circle>' +
            '<path d="m14.31 8 5.74 9.94"></path>' +
            '<path d="M9.69 8h11.48"></path>' +
            '<path d="m7.38 12 5.74-9.94"></path>' +
            '<path d="M9.69 16 3.95 6.06"></path>' +
            '<path d="M14.31 16H2.83"></path>' +
            '<path d="m16.62 12-5.74 9.94"></path>' +
            "</svg></div>" +
            (label ? `<span class="app-loader-label">${label}</span>` : "");
        return el;
    }

    function renderMetaBadges(p) {
        const tagCount = p.tag_count || 0;
        const c = p.collection_count || 0;
        if (tagCount === 0 && c === 0) return "";
        let inner = "";
        if (tagCount > 0) inner += `<div class="photo-meta-badge" title="${tagCount === 1 ? t("grid.one_tag") : t("grid.tags_badge", { count: tagCount })}"><i data-lucide="tag"></i><span>${tagCount}</span></div>`;
        if (c > 0) inner += `<div class="photo-meta-badge" title="${c === 1 ? t("grid.one_collection") : t("grid.collections_badge", { count: c })}"><i data-lucide="library"></i><span>${c}</span></div>`;
        return `<div class="photo-meta-badges">${inner}</div>`;
    }

    function stopVideo() {
        if (detailVideo) {
            detailVideo.pause();
            detailVideo.src = "";
            detailVideo.classList.add("hidden");
        }
        detailImg.classList.remove("hidden");
    }

    function destroy360Viewer(opts = {}) {
        stopVideo();
        destroyVideo360Viewer();
        if (pannellumViewer) {
            try { pannellumViewer.destroy(); } catch (e) { console.error(e); }
            pannellumViewer = null;
        }
        detail360Viewer.classList.add("hidden");
        detail360Viewer.innerHTML = "";
        if (opts.fallbackToFlatVideo && detailCurrentPhotoId && isCurrentPhoto360Video) {
            detailImg.classList.add("hidden");
            if (detailVideo) {
                detailVideo.src = `/api/photos/${detailCurrentPhotoId}/stream`;
                detailVideo.classList.remove("hidden");
            }
        } else {
            detailImg.classList.remove("hidden");
        }
        is360Mode = false;
        detail360Btn.classList.remove("active");
    }

    function initVideo360Viewer(photoId) {
        destroyVideo360Viewer();
        const container = document.getElementById("detail-360-viewer");
        container.innerHTML = "";

        video360Canvas = document.createElement("canvas");
        video360Canvas.style.cssText = "width:100%;height:100%;display:block;cursor:grab;background:#000;";
        container.appendChild(video360Canvas);
        const ctx = video360Canvas.getContext("2d");

        video360Video = document.createElement("video");
        video360Video.src = `/api/photos/${photoId}/stream`;
        video360Video.loop = true;
        video360Video.playsInline = true;
        video360Video.preload = "auto";

        video360Yaw = 0;
        video360Pitch = 0;
        video360Fov = 75;

        function render() {
            if (!video360Video || video360Video.paused || video360Video.ended) {
                video360Raf = requestAnimationFrame(render);
                return;
            }
            const vw = video360Video.videoWidth;
            const vh = video360Video.videoHeight;
            if (!vw || !vh) {
                video360Raf = requestAnimationFrame(render);
                return;
            }
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            if (video360Canvas.width !== cw || video360Canvas.height !== ch) {
                video360Canvas.width = cw;
                video360Canvas.height = ch;
            }
            const fovRad = video360Fov * Math.PI / 180;
            const visibleW = vw * (video360Fov / 360);
            const visibleH = visibleW * (ch / cw);
            const srcX = ((video360Yaw % 360 + 360) % 360) / 360 * vw;
            const srcY = (video360Pitch + 90) / 180 * vh - visibleH / 2;
            ctx.drawImage(video360Video, srcX, srcY, visibleW, visibleH, 0, 0, cw, ch);
            video360Raf = requestAnimationFrame(render);
        }

        const onPointerDown = (e) => {
            video360Dragging = true;
            video360LastX = e.clientX;
            video360LastY = e.clientY;
            video360Canvas.style.cursor = "grabbing";
            e.preventDefault();
        };
        const onPointerMove = (e) => {
            if (!video360Dragging) return;
            const dx = e.clientX - video360LastX;
            const dy = e.clientY - video360LastY;
            video360Yaw -= dx * 0.3;
            video360Pitch = Math.max(-80, Math.min(80, video360Pitch + dy * 0.3));
            video360LastX = e.clientX;
            video360LastY = e.clientY;
        };
        const onPointerUp = () => {
            video360Dragging = false;
            if (video360Canvas) video360Canvas.style.cursor = "grab";
        };
        const onWheel = (e) => {
            video360Fov = Math.max(30, Math.min(110, video360Fov + e.deltaY * 0.05));
            e.preventDefault();
        };

        video360Canvas.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        video360Canvas.addEventListener("wheel", onWheel, { passive: false });

        video360Video._cleanups = () => {
            video360Canvas.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            video360Canvas.removeEventListener("wheel", onWheel);
        };

        video360Video.addEventListener("loadeddata", () => {
            video360Video.play().catch(() => {});
        });

        video360Raf = requestAnimationFrame(render);
        video360Video.load();
    }

    function destroyVideo360Viewer() {
        if (video360Raf) { cancelAnimationFrame(video360Raf); video360Raf = null; }
        if (video360Video) {
            video360Video.pause();
            if (video360Video._cleanups) video360Video._cleanups();
            video360Video.src = "";
            video360Video = null;
        }
        if (video360Canvas) { video360Canvas.remove(); video360Canvas = null; }
    }

    function hasWebGL() {
        try {
            const c = document.createElement("canvas");
            return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
        } catch { return false; }
    }

    function showToast(message, opts = {}) {
        const existing = document.querySelector(".photon-toast");
        if (existing) existing.remove();
        const toast = document.createElement("div");
        toast.className = "photon-toast";
        const icon = opts.icon || "alert-triangle";
        toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span><button class="photon-toast-close"><i data-lucide="x"></i></button>`;
        document.body.appendChild(toast);
        lucide.createIcons({ root: toast });
        toast.querySelector(".photon-toast-close").addEventListener("click", () => {
            toast.classList.add("toast-out");
            setTimeout(() => toast.remove(), 250);
        });
        if (opts.duration !== false) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.add("toast-out");
                    setTimeout(() => toast.remove(), 250);
                }
            }, opts.duration || 6000);
        }
    }

    function initPannellum(photoId) {
        const url = `/api/photos/${photoId}/raw`;
        const img = new Image();
        img.onload = () => {
            if (!is360Mode || detailCurrentPhotoId !== photoId || pannellumViewer) return;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!is360Mode || detailCurrentPhotoId !== photoId || pannellumViewer) return;
                    pannellumViewer = pannellum.viewer("detail-360-viewer", {
                        "type": "equirectangular",
                        "panorama": url,
                        "autoLoad": true
                    });
                    pannellumViewer.on("load", () => {
                        if (pannellumViewer) pannellumViewer.resize();
                    });
                });
            });
        };
        img.onerror = () => {
            if (is360Mode && detailCurrentPhotoId === photoId) destroy360Viewer();
        };
        img.src = url;
    }

    function toggle360() {
        if (!detailCurrentPhotoId) return;
        if (is360Mode) {
            destroy360Viewer({ fallbackToFlatVideo: true });
        } else {
            const data = detailCurrentPhotoData;
            if (data && is360Video(data)) {
                is360Mode = true;
                isCurrentPhoto360Video = true;
                detail360Btn.classList.add("active");
                detailImg.classList.add("hidden");
                if (detailVideo) detailVideo.classList.add("hidden");
                detail360Viewer.classList.remove("hidden");
                initVideo360Viewer(detailCurrentPhotoId);
            } else {
                if (!hasWebGL()) {
                    showToast(
                        `WebGL is disabled — 360° requires hardware acceleration.<br><a href="edge://settings/system" target="_blank">Open Edge Settings</a> and enable "Use hardware acceleration", then restart.`,
                        { icon: "monitor-x", duration: false }
                    );
                    return;
                }
                is360Mode = true;
                isCurrentPhoto360Video = false;
                detail360Btn.classList.add("active");
                detailImg.classList.add("hidden");
                detail360Viewer.classList.remove("hidden");
                initPannellum(detailCurrentPhotoId);
            }
        }
    }

    function toggleFullscreen() {
        const detailImgContainer = document.getElementById("detail-image");
        if (!document.fullscreenElement) {
            detailImgContainer.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    }

    async function checkStatus() {
        try {
            const data = await api("GET", "/api/status");
            statusText.textContent = t("status.connected");
            photoCountH.textContent = data.photo_count > 0 ? t("common.items", { count: data.photo_count.toLocaleString() }) : "";
            if (data.version && versionBadge) {
                const inner = versionBadge.querySelector('.version-badge-inner');
                if (inner) inner.textContent = "v" + data.version;
                else versionBadge.textContent = "v" + data.version;
            }
        } catch {
            statusText.textContent = t("status.disconnected");
        }
    }

    // ── View switching ────────────────────────────────────────────────────

    function setView(view) {
        activeView = view;
        isDragging = false;
        dragHighlightIds.clear();
        hideContextMenu();
        navItems.forEach(li => {
            li.classList.toggle("active", li.dataset.view === view);
        });
        if (view === "locations") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");
            emptyState.classList.add("hidden");
            photoGrid.classList.add("hidden");
            mapView.classList.remove("hidden");
            mapResize.classList.remove("hidden");
            mapPhotosHeader.classList.remove("hidden");
            mapPhotos.classList.remove("hidden");
            initMap();
            fitMapToFolder();
        } else if (view === "tags") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");
            selectedIds.clear();
            emptyState.classList.add("hidden");
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            activeFolderId = null;
            activeCountryCode = null;
            loadTagsBrowse();
        } else if (view === "countries") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");

            selectedIds.clear();
            emptyState.classList.add("hidden");
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            activeFolderId = null;
            activeTagId = null;
            loadCountries();
        } else if (view === "cameras") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");
            selectedIds.clear();
            emptyState.classList.add("hidden");
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            activeFolderId = null;
            activeTagId = null;
            activeCountryCode = null;
            activeCameraBrowseId = null;
            loadCamerasBrowse();
        } else if (view === "collections") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");

            selectedIds.clear();
            emptyState.classList.add("hidden");
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            activeFolderId = null;
            activeTagId = null;
            activeCountryCode = null;
            loadCollectionsBrowse();
        } else if (view === "folders") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");

            selectedIds.clear();
            emptyState.classList.add("hidden");
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            activeTagId = null;
            activeCountryCode = null;
            loadFolderBrowse();
        } else if (view === "cleaning") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            cleaningToolbar.classList.remove("hidden");
            selectedIds.clear();
    
            activeFolderId = null;
            activeTagId = null;
            activeCountryCode = null;
            loadCleaningTab();
        } else if (view === "stats") {
            breadcrumbBar.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");

            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            photoGrid.classList.add("hidden");
            emptyState.classList.add("hidden");
            statsView.classList.remove("hidden");
            loadStats();
        } else {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");

            selectedIds.clear();
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
            mapPhotosHeader.classList.add("hidden");
            if (activeTagId) { activeTagId = null; loadSidebar(); }
            if (activeCountryCode) { activeCountryCode = null; loadSidebar(); }
            activeCameraBrowseId = null;
            loadPhotos();
        }
    }

    // ── Map ───────────────────────────────────────────────────────────────

    async function fitMapToFolder() {
        if (!map) return;
        const params = new URLSearchParams();
        if (activeFolderId) params.set("folder_id", activeFolderId);
        if (activeCollectionId) params.set("collection_id", activeCollectionId);
        if (filterCountry.value) params.set("country", filterCountry.value);
        if (filterCity.value) params.set("city", filterCity.value);
        if (filterCamera.value) params.set("camera", filterCamera.value);
        if (filterLens.value) params.set("lens", filterLens.value);
        if (filterExt.value) params.set("ext", filterExt.value);
        if (filterDateFrom.value) params.set("date_from", filterDateFrom.value);
        if (filterDateTo.value) params.set("date_to", filterDateTo.value);
        if (filterRating.value) params.set("rating", filterRating.value);
        const q = searchInput.value.trim();
        if (q) params.set("q", q);
        let url = "/api/photos/geo/bounds";
        const qs = params.toString();
        if (qs) url += "?" + qs;
        const data = await api("GET", url);
        if (data.count > 0) {
            map.fitBounds([[data.south, data.west], [data.north, data.east]], { padding: [30, 30], maxZoom: 12 });
        }
    }

    function initMap() {
        if (map) return;
        map = L.map("map-view", {
            noWrap: true,
            worldCopyJump: false,
            minZoom: 2,
            // Bounds cover exactly one world so the tile layer never wraps
            // horizontally or vertically (no repeated world copies).
            maxBounds: [[-89, -180], [89, 180]],
            maxBoundsViscosity: 1.0,
        }).setView([46.6, 2.3], 6);
        const mapLoader = createLoader(t("map.loading"));
        mapLoader.id = "map-loader";
        mapView.appendChild(mapLoader);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
            maxZoom: 20,
        }).addTo(map);
        clusterGroup = L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false, disableClusteringAtZoom: 18 });
        plainGroup = L.layerGroup();
        map.addLayer(clusterGroup);
        map.on("moveend", () => loadMapPhotos());
        setTimeout(() => map.invalidateSize(), 100);
    }

    let mapLoadTimer = null;

    function loadMapPhotos() {
        if (!map) return;
        clearTimeout(mapLoadTimer);
        mapLoadTimer = setTimeout(doLoadMapPhotos, 400);
    }

    async function doLoadMapPhotos() {
        const loaderEl = document.getElementById("map-loader");
        const loaderLabel = loaderEl ? loaderEl.querySelector(".app-loader-label") : null;
        if (loaderEl) loaderEl.classList.add("visible");
        if (loaderLabel) loaderLabel.textContent = t("map.loading_map");
        try {
            await loadMapPhotosInner();
        } catch (err) {
            console.error("Map load failed", err);
        } finally {
            if (loaderEl) loaderEl.classList.remove("visible");
            if (loaderLabel) loaderLabel.textContent = "";
        }
    }

    let lastMapQueryUrl = null;

    async function loadMapPhotosInner() {
        const b = map.getBounds();
        let url = `/api/photos/geo?south=${b.getSouth()}&west=${b.getWest()}&north=${b.getNorth()}&east=${b.getEast()}`;
        if (activeFolderId) url += `&folder_id=${activeFolderId}`;
        if (activeCollectionId) url += `&collection_id=${activeCollectionId}`;
        if (filterCountry.value) url += `&country=${encodeURIComponent(filterCountry.value)}`;
        if (filterCity.value) url += `&city=${encodeURIComponent(filterCity.value)}`;
        if (filterCamera.value) url += `&camera=${encodeURIComponent(filterCamera.value)}`;
        if (filterLens.value) url += `&lens=${encodeURIComponent(filterLens.value)}`;
        if (filterExt.value) url += `&ext=${encodeURIComponent(filterExt.value)}`;
        if (filterDateFrom.value) url += `&date_from=${filterDateFrom.value}`;
        if (filterDateTo.value) url += `&date_to=${filterDateTo.value}`;
        if (filterRating.value) url += `&rating=${filterRating.value}`;
        const q = searchInput.value.trim();
        if (q) url += `&q=${encodeURIComponent(q)}`;
        if (url === lastMapQueryUrl) return;
        const data = await api("GET", url);
        lastMapQueryUrl = url;

        clusterGroup.clearLayers();
        plainGroup.clearLayers();
        if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup);
        if (map.hasLayer(plainGroup)) map.removeLayer(plainGroup);

        // If the map holds more than the global threshold, clustering is
        // disabled entirely: every photo renders as an individual marker.
        // Otherwise, photos are bucketed into a spatial grid whose cell size
        // matches the cluster radius (in screen px). Cells with >= the group-size
        // threshold become clusters; smaller cells render as individual markers.
        // A group-size threshold of 1 therefore groups from 2 photos at a spot.
        const clusterGlobalThreshold = parseInt(localStorage.getItem("photonic.clusterGlobalThreshold") || "5000") || 5000;
        const clusteringDisabled = data.total < clusterGlobalThreshold;

        let densePhotos = [];
        let sparsePhotos = [];

        if (!clusteringDisabled) {
            const clusterThreshold = parseInt(localStorage.getItem("photonic.clusterThreshold") || "500") || 500;
            const minClusterSize = Math.max(2, clusterThreshold);
            const zoom = map.getZoom();
            const center = map.getCenter();
            const centerPx = map.project(center, zoom);
            const radiusPx = 40;
            const dLng = Math.max(1e-6, Math.abs(map.unproject(L.point(centerPx.x + radiusPx, centerPx.y), zoom).lng - center.lng));
            const dLat = Math.max(1e-6, Math.abs(map.unproject(L.point(centerPx.x, centerPx.y + radiusPx), zoom).lat - center.lat));
            const cells = new Map();
            for (const ph of data.photos) {
                const key = Math.floor(ph.lat / dLat) + ":" + Math.floor(ph.lng / dLng);
                let arr = cells.get(key);
                if (!arr) { arr = []; cells.set(key, arr); }
                arr.push(ph);
            }
            const dense = [];
            const sparse = [];
            for (const arr of cells.values()) {
                (arr.length >= minClusterSize ? dense : sparse).push(...arr);
            }
            densePhotos = dense;
            sparsePhotos = sparse;
        } else {
            sparsePhotos = data.photos;
        }
        map.addLayer(clusterGroup);
        map.addLayer(plainGroup);

        // Render markers in async chunks so the main thread (and the map
        // loader) can breathe on very large datasets instead of freezing.
        const loaderEl = document.getElementById("map-loader");
        const loaderLabel = loaderEl ? loaderEl.querySelector(".app-loader-label") : null;
        let done = 0;
        const total = data.photos.length;
        const updateProgress = () => {
            if (loaderLabel) loaderLabel.textContent = `Placing ${done.toLocaleString()} / ${total.toLocaleString()}…`;
        };
        const yieldForUi = () => new Promise(r => setTimeout(r, 0));
        const CHUNK = 400;

        for (let i = 0; i < densePhotos.length; i += CHUNK) {
            const lot = densePhotos.slice(i, i + CHUNK).map(ph => {
                const m = L.marker([ph.lat, ph.lng]);
                m.on("click", () => openDetail(ph.id));
                return m;
            });
            clusterGroup.addLayers(lot);
            done += lot.length;
            updateProgress();
            await yieldForUi();
        }
        for (let i = 0; i < sparsePhotos.length; i += CHUNK) {
            const end = Math.min(i + CHUNK, sparsePhotos.length);
            for (let j = i; j < end; j++) {
                const ph = sparsePhotos[j];
                const m = L.marker([ph.lat, ph.lng]);
                m.on("click", () => openDetail(ph.id));
                plainGroup.addLayer(m);
                done++;
            }
            updateProgress();
            await yieldForUi();
        }

        mapStripQueue = data.photos.slice();
        if (mapStripObserver) mapStripObserver.disconnect();
        mapPhotos.innerHTML = "";
        mapSentinel = document.createElement("div");
        mapSentinel.className = "map-strip-sentinel";
        mapPhotos.appendChild(mapSentinel);
        if (mapStripObserver) mapStripObserver.observe(mapSentinel);
        fillMapStripViewport();
        renderSelection();
        photoCountH.textContent = t("map.geo_tagged", { count: data.total.toLocaleString() });
        if (mapPhotoCount) mapPhotoCount.textContent = t("common.items", { count: data.total.toLocaleString() });
    }

    let mapStripQueue = [];
    let mapSentinel = null;

    function renderMapStripChunk() {
        const CHUNK = 80;
        const items = mapStripQueue.splice(0, CHUNK);
        const frag = document.createDocumentFragment();
        for (const p of items) {
            const card = document.createElement("div");
            card.className = "photo-card";
            card.dataset.photoId = p.id;
            let badge = "";
            if (is360Photo(p)) {
                badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
            } else if (isVideo(p)) {
                badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
            }
            card.innerHTML = `
                <img src="${p.thumb}" alt="${p.filename}" loading="lazy" decoding="async">
                ${badge}
                ${renderMetaBadges(p)}
            `;
            frag.appendChild(card);
        }
        if (items.length) mapPhotos.insertBefore(frag, mapSentinel);
        lucide.createIcons();
    }

    function fillMapStripViewport() {
        let guard = 0;
        while (mapStripQueue.length > 0 && guard < 200) {
            const r = mapSentinel.getBoundingClientRect();
            const rr = mapPhotos.getBoundingClientRect();
            if (r.top > rr.bottom + 900) break;
            renderMapStripChunk();
            guard++;
        }
        if (mapStripQueue.length === 0 && mapStripObserver) mapStripObserver.disconnect();
    }

    const mapStripObserver = ("IntersectionObserver" in window)
        ? new IntersectionObserver(() => fillMapStripViewport(), { root: mapPhotos, rootMargin: "900px 0px" })
        : null;

    // ── Sidebar (Folders + Tags always visible) ────────────────────────────

    async function loadSidebar() {
        const [rawFolders, rawCollections, rawTags] = await Promise.all([
            api("GET", "/api/folders/tree"),
            api("GET", "/api/collections/tree"),
            api("GET", "/api/tags"),
        ]);
        const folders = Array.isArray(rawFolders) ? rawFolders : [];
        const collections = Array.isArray(rawCollections) ? rawCollections : [];
        const tags = Array.isArray(rawTags) ? rawTags : [];
        btnRescan.disabled = folders.length === 0;

        let html = "";
        if (folders.length > 0 || collections.length > 0 || tags.length > 0) {
            html += '<div class="sb-quick-title">' + t("sidebar.quick_filters") + '</div>';
        }
        if (folders.length > 0) {
            const fCollapsed = localStorage.getItem("sb-folders") === "1";
            html += '<h4 class="sb-section-header' + (fCollapsed ? " collapsed" : "") + '" data-section="sb-folders"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></svg> ' + t("sidebar.folders") + '</h4>';
            html += '<div class="sb-section-content' + (fCollapsed ? " collapsed" : "") + '">';
             html += '<div class="folder-item' + (activeFolderId === null ? " active" : "") + '" data-folder-id="all">' + t("sidebar.all_items") + '</div>';
            for (const f of folders) {
                const active = activeFolderId === f.id ? " active" : "";
                const indent = f.depth > 0 ? ` style="padding-left:${24 + f.depth * 16}px"` : "";
                html += `<div class="folder-item${active}" data-folder-id="${f.id}" title="${f.path}"${indent}>${f.name}</div>`;
            }
            html += '</div>';
        }

        if (collections.length > 0) {
            const cCollapsed = localStorage.getItem("sb-collections") === "1";
            html += '<h4 class="sb-section-header' + (cCollapsed ? " collapsed" : "") + '" data-section="sb-collections"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg> ' + t("sidebar.collections") + '</h4>';
            html += '<div class="sb-section-content' + (cCollapsed ? " collapsed" : "") + '">';
            for (const c of collections) {
                const active = activeCollectionId === c.id ? " active" : "";
                const indent = c.depth > 0 ? ` style="padding-left:${24 + c.depth * 16}px"` : "";
                const color = c.color || TAG_COLORS[Math.abs(hashStr(c.name)) % TAG_COLORS.length];
                const iconName = c.icon || "library";
                html += `<div class="collection-item${active}" data-collection-id="${c.id}"${indent}><span class="tag-dot collection-dot" style="background:${color}"><i data-lucide="${iconName}"></i></span>${c.name} <span class="tag-count">${c.photo_count}</span></div>`;
            }
            html += '</div>';
        }

        if (tags.length > 0) {
            const tCollapsed = localStorage.getItem("sb-tags") === "1";
            html += '<h4 class="sb-section-header' + (tCollapsed ? " collapsed" : "") + '" data-section="sb-tags"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle></svg> ' + t("sidebar.tags") + '</h4>';
            html += '<div class="sb-section-content' + (tCollapsed ? " collapsed" : "") + '">';
            for (const t of tags) {
                const active = activeTagId === t.id ? " active" : "";
                const color = t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
                html += `<div class="tag-item${active}" data-tag-id="${t.id}"><span class="tag-dot" style="background:${color}"></span>${t.name} <span class="tag-count">${t.photo_count}</span></div>`;
            }
            html += '</div>';
        }

        sidebarFilters.innerHTML = html;
        lucide.createIcons({ root: sidebarFilters });

        sidebarFilters.querySelectorAll(".sb-section-header").forEach(h => {
            h.addEventListener("click", () => {
                const key = h.dataset.section;
                const content = h.nextElementSibling;
                const collapsed = h.classList.toggle("collapsed");
                content.classList.toggle("collapsed", collapsed);
                localStorage.setItem(key, collapsed ? "1" : "0");
            });
        });

        sidebarFilters.querySelectorAll(".folder-item").forEach(el => {
            el.addEventListener("click", () => {
                const fid = el.dataset.folderId;
                activeFolderId = fid === "all" ? null : parseInt(fid);
                loadSidebar();
                if (activeView === "locations") {
                    fitMapToFolder();
                } else {
                    loadPhotos();
                }
            });
        });

        const getItemLabel = (el) => {
            const clone = el.cloneNode(true);
            clone.querySelectorAll(".tag-count, .tag-dot").forEach(n => n.remove());
            return clone.textContent.replace(/\s+/g, " ").trim();
        };

        const bindDropTarget = (el) => {
            el.addEventListener("dragenter", (e) => {
                if (!isPhotoDnd(e)) return;
                e.preventDefault();
                el.classList.add("drop-target");
            });
            el.addEventListener("dragover", (e) => {
                if (!isPhotoDnd(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                el.classList.add("drop-target");
            });
            el.addEventListener("dragleave", (e) => {
                if (el.contains(e.relatedTarget)) return;
                el.classList.remove("drop-target");
            });
            el.addEventListener("drop", async (e) => {
                if (!isPhotoDnd(e)) return;
                e.preventDefault();
                el.classList.remove("drop-target");
                const ids = parsePhotoDnd(e);
                if (ids.length === 0) return;
                const tid = el.dataset.tagId ? parseInt(el.dataset.tagId) : null;
                const cid = el.dataset.collectionId ? parseInt(el.dataset.collectionId) : null;
                const res = (tid !== null)
                    ? await api("POST", "/api/photos/bulk-tags", { photo_ids: ids, tag_id: tid })
                    : await api("POST", "/api/photos/bulk-collections", { photo_ids: ids, collection_id: cid });
                if (res && res.ok) {
                    const target = getItemLabel(el);
                    showToast(t(tid !== null ? "toast.tagged" : "toast.added_to", { count: ids.length, target }), { icon: "check" });
                    loadSidebar();
                    if ((tid !== null && activeTagId === tid) || (cid !== null && activeCollectionId === cid)) {
                        if (activeView === "collections") loadCollectionsBrowse();
                        else loadPhotos();
                    }
                } else {
                    showToast((res && res.error) || "Failed to assign");
                }
            });
        };

        sidebarFilters.querySelectorAll(".collection-item").forEach(el => {
            bindDropTarget(el);
            el.addEventListener("click", () => {
                const cid = parseInt(el.dataset.collectionId);
                activeCollectionId = activeCollectionId === cid ? null : cid;
                loadSidebar();
                if (activeView === "collections") {
                    loadCollectionsBrowse();
                } else {
                    loadPhotos();
                }
            });
        });

        sidebarFilters.querySelectorAll(".tag-item").forEach(el => {
            bindDropTarget(el);
            el.addEventListener("click", () => {
                const tid = parseInt(el.dataset.tagId);
                activeTagId = activeTagId === tid ? null : tid;
                loadSidebar();
                loadPhotos();
            });
        });
    }

    // ── Folder Browse (main area) ─────────────────────────────────────────

    function renderFolderBreadcrumb() {
        if (activeView !== "folders") {
            breadcrumbBar.classList.add("hidden");
            return;
        }
        breadcrumbBar.classList.remove("hidden");
        let html = `<span class="bc-item bc-link" data-bc="folders-root">${t("sidebar.folders")}</span>`;
        for (let i = 0; i < folderBrowsePath.length; i++) {
            html += '<span class="bc-sep">›</span>';
            if (i < folderBrowsePath.length - 1) {
                html += `<span class="bc-item bc-link" data-bc="folders-${i}">${folderBrowsePath[i].name}</span>`;
            } else {
                html += `<span class="bc-item bc-current">${folderBrowsePath[i].name}</span>`;
            }
        }
        breadcrumbBar.innerHTML = html;
        breadcrumbBar.querySelectorAll(".bc-link").forEach(el => {
            el.addEventListener("click", () => {
                const idx = el.dataset.bc;
                if (idx === "folders-root") {
                    folderBrowsePath = [];
                } else {
                    folderBrowsePath = folderBrowsePath.slice(0, parseInt(idx.split("-")[1]) + 1);
                }
                loadFolderBrowse();
            });
        });
    }

    async function loadFolderBrowse() {
        const fpath = folderBrowsePath.length > 0 ? folderBrowsePath[folderBrowsePath.length - 1].path : null;
        const url = fpath ? `/api/folders/browse?folder_path=${encodeURIComponent(fpath)}` : "/api/folders/browse";
        const data = await api("GET", url);
        renderFolderBreadcrumb();

        const folders = data.folders || [];
        const photos = data.photos || [];

        if (folderBrowsePath.length === 0 && folders.length === 0) {
            emptyState.classList.remove("hidden");
            photoGrid.classList.add("hidden");
            photoCountH.textContent = "";
            return;
        }
        emptyState.classList.add("hidden");
        photoGrid.classList.remove("hidden");
        clearGrid();
        const totalFolders = folders.length;
        photoCountH.textContent = totalFolders > 0 ? `${totalFolders} folder${totalFolders > 1 ? "s" : ""}` : "";

        for (const f of folders) {
            const card = document.createElement("div");
            card.className = "country-card";
            const thumbs = (f.sample_ids || []).map(id =>
                `<img src="/api/photos/${id}/thumb/medium" alt="" loading="lazy">`
            ).join("");
            card.innerHTML =
                `<div class="country-card-grid">${thumbs}</div>` +
                `<div class="country-card-info">` +
                `<span class="folder-icon">&#128193;</span> ` +
                `<span class="country-card-name">${f.name}</span>` +
                `<span class="country-card-count">${(f.photo_count || 0).toLocaleString()}</span>` +
                `</div>`;
            card.addEventListener("click", () => {
                folderBrowsePath.push({ path: f.path, name: f.name });
                loadFolderBrowse();
            });
            photoGrid.appendChild(card);
        }

        if (photos.length > 0) {
            const count = photos.length;
            photoCountH.textContent += (totalFolders > 0 ? " + " : "") + t("common.direct_items", { count: count.toLocaleString() });
            for (const p of photos) {
                const card = document.createElement("div");
                card.className = "photo-card";
                card.title = p.filename;
                let badge = "";
                if (is360Photo(p)) {
                    badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
                } else if (isVideo(p)) {
                    badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
                }
                card.innerHTML = `
                    <img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">
                    ${badge}
                    ${renderMetaBadges(p)}
                    <div class="photo-label">${p.filename}</div>
                `;
                card.addEventListener("click", () => openDetail(p.id));
                photoGrid.appendChild(card);
            }
            lucide.createIcons();
        }
    }

    // ── Collections Browse (main area) ────────────────────────────────────

    function renderCollectionBreadcrumb() {
        if (activeView !== "collections") {
            breadcrumbBar.classList.add("hidden");
            return;
        }
        breadcrumbBar.classList.remove("hidden");
        let html = `<span class="bc-item bc-link" data-bc="collections-root"><i data-lucide="library" style="width: 14px; height: 14px; margin-right: 4px;"></i>${t("sidebar.collections")}</span>`;
        for (let i = 0; i < collectionBrowsePath.length; i++) {
            html += '<span class="bc-sep">›</span>';
            const icon = collectionBrowsePath[i].icon ? `<i data-lucide="${collectionBrowsePath[i].icon}" style="width: 14px; height: 14px; margin-right: 4px;"></i>` : "";
            if (i < collectionBrowsePath.length - 1) {
                html += `<span class="bc-item bc-link" data-bc="collections-${i}">${icon}${collectionBrowsePath[i].name}</span>`;
            } else {
                html += `<span class="bc-item bc-current">${icon}${collectionBrowsePath[i].name}</span>`;
            }
        }
        breadcrumbBar.innerHTML = html;
        lucide.createIcons({ root: breadcrumbBar });
        breadcrumbBar.querySelectorAll(".bc-link").forEach(el => {
            el.addEventListener("click", () => {
                const idx = el.dataset.bc;
                if (idx === "collections-root") {
                    collectionBrowsePath = [];
                } else {
                    collectionBrowsePath = collectionBrowsePath.slice(0, parseInt(idx.split("-")[1]) + 1);
                }
                loadCollectionsBrowse();
            });
        });
    }

    async function loadCollectionsBrowse() {
        const cid = collectionBrowsePath.length > 0 ? collectionBrowsePath[collectionBrowsePath.length - 1].id : null;
        const url = cid ? `/api/collections/browse?parent_id=${cid}` : "/api/collections/browse";
        const collections = await api("GET", url);
        
        let photos = [];
        if (cid) {
            const photosData = await api("GET", `/api/photos?collection_id=${cid}&per_page=500`);
            photos = photosData.photos || [];
        }

        renderCollectionBreadcrumb();

        if (collectionBrowsePath.length === 0 && collections.length === 0) {
            emptyState.classList.remove("hidden");
            photoGrid.classList.add("hidden");
            photoCountH.textContent = t("collections.none_found");
            return;
        }
        emptyState.classList.add("hidden");
        photoGrid.classList.remove("hidden");
        clearGrid();
        
        const totalCollections = collections.length;
        photoCountH.textContent = totalCollections > 0 ? t("common.collections_count", { count: totalCollections }) : "";

        for (const c of collections) {
            const card = document.createElement("div");
            card.className = "country-card";
            const thumbs = (c.sample_ids || []).map(id =>
                `<img src="/api/photos/${id}/thumb/medium" alt="" loading="lazy">`
            ).join("");
            const icon = c.icon ? `<i data-lucide="${c.icon}"></i>` : "";
            const colorDot = c.color ? `<span class="tag-dot" style="background:${c.color}"></span>` : "";
            card.innerHTML =
                `<div class="country-card-grid">${thumbs}</div>` +
                `<div class="country-card-info">` +
                `${colorDot}${icon}` +
                `<span class="country-card-name">${c.name}</span>` +
                `<span class="country-card-count">${(c.photo_count || 0).toLocaleString()}</span>` +
                `</div>`;
            card.addEventListener("click", () => {
                collectionBrowsePath.push({ id: c.id, name: c.name, icon: c.icon });
                loadCollectionsBrowse();
            });
            photoGrid.appendChild(card);
        }

        if (photos.length > 0) {
            const count = photos.length;
            photoCountH.textContent += (totalCollections > 0 ? " + " : "") + t("common.direct_items", { count: count.toLocaleString() });
            for (const p of photos) {
                const card = document.createElement("div");
                card.className = "photo-card";
                card.title = p.filename;
                let badge = "";
                if (is360Photo(p)) {
                    badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
                } else if (isVideo(p)) {
                    badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
                }
                card.innerHTML = `
                    <img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">
                    ${badge}
                    ${renderMetaBadges(p)}
                    <div class="photo-label">${p.filename}</div>
                `;
                card.addEventListener("click", () => openDetail(p.id));
                photoGrid.appendChild(card);
            }
        }
        lucide.createIcons();
    }

    // ── Tags Browse (main area) ────────────────────────────────────────────

    let tagsData = [];

    function renderTagBreadcrumb() {
        if (activeView !== "tags") {
            breadcrumbBar.classList.add("hidden");
            return;
        }
        breadcrumbBar.classList.remove("hidden");
        if (!activeTagBrowseId) {
            breadcrumbBar.innerHTML = `<span class="bc-item bc-current">${t("sidebar.tags")}</span>`;
        } else {
            const tagObj = tagsData.find(x => x.id === activeTagBrowseId);
            const color = tagObj ? (tagObj.color || TAG_COLORS[Math.abs(hashStr(tagObj.name)) % TAG_COLORS.length]) : "#888";
            const name = tagObj ? tagObj.name : activeTagBrowseId;
            breadcrumbBar.innerHTML =
                `<span class="bc-item bc-link" data-bc="tags">${t("sidebar.tags")}</span>` +
                '<span class="bc-sep">&#8250;</span>' +
                '<span class="bc-item bc-current"><span class="tag-dot" style="background:' + color + '"></span> ' + name + '</span>';
            breadcrumbBar.querySelector(".bc-link").addEventListener("click", () => {
                activeTagBrowseId = null;
                loadTagsBrowse();
            });
        }
    }

    async function loadTagsBrowse() {
        tagsData = await api("GET", "/api/tags/browse");
        if (!Array.isArray(tagsData)) tagsData = [];
        renderTagBreadcrumb();
        if (!activeTagBrowseId) {
            if (tagsData.length === 0) {
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                photoCountH.textContent = "";
                return;
            }
            emptyState.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            clearGrid();
            photoCountH.textContent = t("common.tags_count", { count: tagsData.length });
            for (const tag of tagsData) {
                const card = document.createElement("div");
                card.className = "country-card";
                const color = tag.color || TAG_COLORS[Math.abs(hashStr(tag.name)) % TAG_COLORS.length];
                const thumbs = tag.sample_ids.map(id =>
                    `<img src="/api/photos/${id}/thumb/medium" alt="" loading="lazy">`
                ).join("");
                card.innerHTML =
                    `<div class="country-card-grid">${thumbs}</div>` +
                    `<div class="country-card-info">` +
                    `<span class="tag-dot" style="background:${color}"></span> ` +
                    `<span class="country-card-name">${tag.name}</span>` +
                    `<span class="country-card-count">${tag.photo_count.toLocaleString()}</span>` +
                    `</div>`;
                card.addEventListener("click", () => {
                    activeTagBrowseId = tag.id;
                    loadTagsBrowse();
                });
                photoGrid.appendChild(card);
            }
        } else {
            const tag = tagsData.find(x => x.id === activeTagBrowseId);
            if (tag) {
                const color = tag.color || TAG_COLORS[Math.abs(hashStr(tag.name)) % TAG_COLORS.length];
                photoCountH.innerHTML = `<span class="tag-dot" style="background:${color}"></span> ${tag.name} — ${t("common.items", { count: tag.photo_count.toLocaleString() })}`;
            }
            loadPhotos();
        }
    }

    // ── Cameras Browse (main area) ────────────────────────────────────────

    let camerasData = [];

    function renderCameraBreadcrumb() {
        if (activeView !== "cameras") {
            breadcrumbBar.classList.add("hidden");
            return;
        }
        breadcrumbBar.classList.remove("hidden");
        if (!activeCameraBrowseId) {
            breadcrumbBar.innerHTML = `<span class="bc-item bc-current">${t("sidebar.cameras")}</span>`;
        } else {
            breadcrumbBar.innerHTML =
                `<span class="bc-item bc-link" data-bc="cameras">${t("sidebar.cameras")}</span>` +
                '<span class="bc-sep">&#8250;</span>' +
                '<span class="bc-item bc-current">' + activeCameraBrowseId + '</span>';
            breadcrumbBar.querySelector(".bc-link").addEventListener("click", () => {
                activeCameraBrowseId = null;
                loadCamerasBrowse();
            });
        }
    }

    async function loadCamerasBrowse() {
        camerasData = await api("GET", "/api/cameras/browse");
        if (!Array.isArray(camerasData)) camerasData = [];
        renderCameraBreadcrumb();
        if (!activeCameraBrowseId) {
            if (camerasData.length === 0) {
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                photoCountH.textContent = "";
                return;
            }
            emptyState.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            clearGrid();
            photoCountH.textContent = `${camerasData.length} cameras`;
            for (const c of camerasData) {
                const card = document.createElement("div");
                card.className = "country-card";
                const thumbs = c.sample_ids.map(id =>
                    `<img src="/api/photos/${id}/thumb/medium" alt="" loading="lazy">`
                ).join("");
                card.innerHTML =
                    `<div class="country-card-grid">${thumbs}</div>` +
                    `<div class="country-card-info">` +
                    `<span class="country-card-name">&#128247; ${c.name}</span>` +
                    `<span class="country-card-count">${c.photo_count.toLocaleString()}</span>` +
                    `</div>`;
                card.addEventListener("click", () => {
                    activeCameraBrowseId = c.name;
                    loadCamerasBrowse();
                });
                photoGrid.appendChild(card);
            }
        } else {
            photoCountH.innerHTML = `&#128247; ${activeCameraBrowseId}`;
            loadPhotos();
        }
    }

    // ── Countries ──────────────────────────────────────────────────────────

    function countryFlag(code) {
        if (!code || code.length !== 2) return "";
        const c = code.toLowerCase();
        return `<img src="https://flagcdn.com/24x18/${c}.png" alt="${c}" class="country-flag-img" loading="lazy">`;
    }

    let countriesData = [];

    function renderBreadcrumb() {
        if (activeView === "folders") {
            renderFolderBreadcrumb();
            return;
        }
        if (activeView === "tags") {
            renderTagBreadcrumb();
            return;
        }
        if (activeView === "cameras") {
            renderCameraBreadcrumb();
            return;
        }
        if (activeView !== "countries") {
            breadcrumbBar.classList.add("hidden");
            return;
        }
        breadcrumbBar.classList.remove("hidden");
        if (!activeCountryCode) {
            breadcrumbBar.innerHTML = `<span class="bc-item bc-current">${t("sidebar.countries")}</span>`;
        } else {
            const c = countriesData.find(x => x.code === activeCountryCode);
            const name = c ? `${countryFlag(c.code)} ${c.name}` : activeCountryCode;
            breadcrumbBar.innerHTML =
                `<span class="bc-item bc-link" data-bc="countries">${t("sidebar.countries")}</span>` +
                '<span class="bc-sep">›</span>' +
                '<span class="bc-item bc-current">' + name + '</span>';
            breadcrumbBar.querySelector(".bc-link").addEventListener("click", () => {
                activeCountryCode = null;
                loadCountries();
            });
        }
    }

    async function loadCountries() {
        countriesData = await api("GET", "/api/countries");
        if (!Array.isArray(countriesData)) countriesData = [];
        renderBreadcrumb();
        if (!activeCountryCode) {
            if (countriesData.length === 0) {
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                photoCountH.textContent = "";
                return;
            }
            emptyState.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            photoCountH.textContent = `${countriesData.length} countries`;
            clearGrid();
            for (const c of countriesData) {
                const card = document.createElement("div");
                card.className = "country-card";
                card.dataset.country = c.code;
                const thumbs = c.sample_ids.map(id =>
                    `<img src="/api/photos/${id}/thumb/medium" alt="" loading="lazy">`
                ).join("");
                card.innerHTML =
                    `<div class="country-card-grid">${thumbs}</div>` +
                    `<div class="country-card-info">` +
                    `<span class="country-card-flag">${countryFlag(c.code)}</span> ` +
                    `<span class="country-card-name">${c.name}</span>` +
                    `<span class="country-card-count">${c.photo_count.toLocaleString()}</span>` +
                    `</div>`;
                card.addEventListener("click", () => {
                    activeCountryCode = c.code;
                    loadCountries();
                });
                photoGrid.appendChild(card);
            }
        } else {
            const c = countriesData.find(x => x.code === activeCountryCode);
            if (c) photoCountH.innerHTML = `${countryFlag(c.code)} ${c.name} — ${t("common.items", { count: c.photo_count.toLocaleString() })}`;
            loadPhotos();
        }
    }

    // ── Cleaning ─────────────────────────────────────────────────────────

    function togglePhotoSelect(id, cb) {
        if (cb.checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
        renderSelection();
    }

    function renderCleaningCards(photos, selectable) {
        for (const p of photos) {
            const card = document.createElement("div");
            card.className = "photo-card cleaning-card";
            card.dataset.photoId = p.id;
            card.title = p.filename;
            let extra = "";
            if (selectable) {
                extra = `<div class="cleaning-check"><input type="checkbox" data-id="${p.id}"></div>`;
            }
            if (p.blur_score != null && p.blur_score < 15) {
                extra += `<div class="cleaning-badge blur">Very blurry</div>`;
            } else if (p.blur_score != null && p.blur_score < 50) {
                extra += `<div class="cleaning-badge blur">Blurry</div>`;
            }
            if (p.flags) {
                if (p.flags.is_black) extra += `<div class="cleaning-badge bad">Black</div>`;
                else if (p.flags.is_white) extra += `<div class="cleaning-badge bad">White</div>`;
                else if (p.flags.is_underexposed) extra += `<div class="cleaning-badge bad">Underexposed</div>`;
                else if (p.flags.is_overexposed) extra += `<div class="cleaning-badge bad">Overexposed</div>`;
            }
            card.innerHTML = extra +
                `<img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">` +
                `<div class="photo-label">${p.filename}</div>`;
            card.addEventListener("click", (e) => {
                if (e.target.closest(".cleaning-check")) return;
                openDetail(p.id);
            });
            if (selectable) {
                const cb = card.querySelector("input[type=checkbox]");
                cb.addEventListener("change", () => togglePhotoSelect(p.id, cb));
            }
            photoGrid.appendChild(card);
        }
    }

    async function loadCleaningTab() {
        selectedIds.clear();

        cleaningTab = document.querySelector(".cleaning-tab.active")?.dataset.tab || "duplicates";
        clearGrid();
        emptyState.classList.add("hidden");
        photoGrid.classList.remove("hidden");

        if (cleaningTab === "duplicates") {
            const data = await api("GET", "/api/cleaning/duplicates");
            if (data.count === 0) {
                photoCountH.textContent = t("cleaning.no_duplicates");
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = t("cleaning.duplicates_count", { count: data.count, groups: data.groups.length });
            for (const group of data.groups) {
                const sep = document.createElement("div");
                sep.className = "cleaning-separator";
                sep.innerHTML = `<span>${t("cleaning.identical_files", { count: group.length, size: (group[0].size / 1048576).toFixed(1) })}</span>`;
                photoGrid.appendChild(sep);
                renderCleaningCards(group, true);
            }
        } else if (cleaningTab === "blurry") {
            const data = await api("GET", "/api/cleaning/blurry");
            if (data.count === 0) {
                photoCountH.textContent = t("cleaning.no_blurry");
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = t("cleaning.blurry_count", { count: data.count });
            renderCleaningCards(data.photos, true);
        } else if (cleaningTab === "similar") {
            const data = await api("GET", "/api/cleaning/similar");
            if (data.count === 0) {
                photoCountH.textContent = t("cleaning.no_similar");
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = t("cleaning.similar_count", { count: data.count, groups: data.groups.length });
            for (const group of data.groups) {
                const sep = document.createElement("div");
                sep.className = "cleaning-separator";
                sep.innerHTML = `<span>${t("cleaning.similar_sep", { count: group.length })}</span>`;
                photoGrid.appendChild(sep);
                renderCleaningCards(group, true);
            }
        } else if (cleaningTab === "bad") {
            const data = await api("GET", "/api/cleaning/bad");
            if (data.count === 0) {
                photoCountH.textContent = t("cleaning.no_bad");
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = t("cleaning.bad_count", { count: data.count });
            renderCleaningCards(data.photos, true);
        }
    }

    let analyzePollTimer = null;
    async function startAnalysis() {
        btnAnalyze.disabled = true;
        cleaningStatus.classList.remove("hidden");
        cleaningStatus.textContent = t("cleaning.starting");
        await api("POST", "/api/cleaning/analyze");
        pollAnalysis();
    }

    async function pollAnalysis() {
        const data = await api("GET", "/api/cleaning/status");
        if (data.running) {
            const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
            cleaningStatus.textContent = `${data.phase} ${data.done}/${data.total} (${pct}%)`;
            analyzePollTimer = setTimeout(pollAnalysis, 1000);
        } else {
            cleaningStatus.classList.add("hidden");
            btnAnalyze.disabled = false;
            clearTimeout(analyzePollTimer);
            loadCleaningTab();
        }
    }

    async function deleteSelected() {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        await api("POST", "/api/cleaning/delete", { ids });
        selectedIds.clear();
        renderSelection();
        loadCleaningTab();
    }

    async function confirmDelete(ids) {
        const n = ids.length;
        const ok = await showConfirm(
            n === 1 ? t("confirm.delete_photo") : t("confirm.delete_photos", { count: n }),
            n === 1 ? t("confirm.delete_photo_msg") : t("confirm.delete_photos_msg", { count: n }),
            t("confirm.delete")
        );
        if (!ok) return false;
        for (const id of ids) selectedIds.add(id);
        await api("POST", "/api/cleaning/delete", { ids });
        selectedIds.clear();
        renderSelection();
        onFilterChange();
        return true;
    }

    async function removeTagsFromTargets(ids) {
        const ok = await showConfirm(
            t("confirm.remove_all_tags_title", { count: ids.length }),
            t("confirm.remove_all_tags_msg"),
            t("context.remove_tags")
        );
        if (!ok) return;
        for (const id of ids) {
            const tags = await api("GET", `/api/photos/${id}/tags`);
            if (Array.isArray(tags)) {
                for (const t of tags) {
                    await api("DELETE", `/api/photos/${id}/tags/${t.id}`);
                }
            }
        }
        if (activeView === "tags") loadTagsBrowse();
        loadSidebar();
        renderSelection();
    }

    // ── Stats ─────────────────────────────────────────────────────────────

    let statsChartFormat = null;
    let statsChartTimeline = null;
    let statsChartCountries = null;

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
        return (bytes / 1073741824).toFixed(2) + " GB";
    }

    function formatSizeShort(bytes) {
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + " MB";
        return (bytes / 1073741824).toFixed(1) + " GB";
    }

    async function loadStats() {
        const d = await api("GET", "/api/stats");
        if (statsChartFormat) { statsChartFormat.destroy(); statsChartFormat = null; }
        if (statsChartTimeline) { statsChartTimeline.destroy(); statsChartTimeline = null; }
        if (statsChartCountries) { statsChartCountries.destroy(); statsChartCountries = null; }

        const geoPct = d.geo_total > 0 ? ((d.geo_count / d.geo_total) * 100).toFixed(1) : 0;

        statsView.innerHTML = `
            <div class="stats-summary">
                <div class="stat-card">
                    <div class="stat-value">${d.total_photos.toLocaleString()}</div>
                    <div class="stat-label">${t("stats.photos")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatSizeShort(d.total_size)}</div>
                    <div class="stat-label">${t("stats.total_size")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.geo_count.toLocaleString()} / ${d.geo_total.toLocaleString()}</div>
                    <div class="stat-label">${t("stats.geolocalized", { pct: geoPct })}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.formats.length}</div>
                    <div class="stat-label">${t("stats.formats")}</div>
                </div>
            </div>
            <div class="stats-charts">
                <div class="stats-chart-box stats-chart-wide">
                    <h4>${t("stats.photos_over_time")}</h4>
                    <canvas id="chart-timeline"></canvas>
                </div>
                <div class="stats-chart-box">
                    <h4>${t("stats.formats")}</h4>
                    <canvas id="chart-format"></canvas>
                </div>
                <div class="stats-chart-box">
                    <h4>${t("stats.top_countries")}</h4>
                    <canvas id="chart-countries"></canvas>
                </div>
            </div>
        `;

        const extColors = [
            "#5b9fd6","#e74c3c","#2ecc71","#f1c40f","#9b59b6",
            "#e67e22","#1abc9c","#e84393","#00cec9","#636e72",
            "#fd79a8","#74b9ff","#55efc4","#fab1a0","#a29bfe",
        ];

        const fmtCtx = document.getElementById("chart-format");
        if (fmtCtx) {
            statsChartFormat = new Chart(fmtCtx, {
                type: "doughnut",
                data: {
                    labels: d.formats.map(f => f.ext.toUpperCase()),
                    datasets: [{
                        data: d.formats.map(f => f.count),
                        backgroundColor: d.formats.map((_, i) => extColors[i % extColors.length]),
                        borderWidth: 0,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "right", labels: { color: "#888", font: { size: 11 }, padding: 8, boxWidth: 14 } },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    const f = d.formats[ctx.dataIndex];
                                    return ` ${t("stats.files_with_size", { count: f.count.toLocaleString(), size: formatSizeShort(f.size) })}`;
                                }
                            }
                        }
                    },
                },
            });
        }

        const timeCtx = document.getElementById("chart-timeline");
        if (timeCtx && d.timeline.length > 0) {
            const months = d.timeline.map(t => t.month);
            const counts = d.timeline.map(t => t.count);
            let cumulative = [];
            let sum = 0;
            for (const c of counts) { sum += c; cumulative.push(sum); }

            statsChartTimeline = new Chart(timeCtx, {
                type: "line",
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: t("stats.monthly"),
                            data: counts,
                            borderColor: "#5b9fd6",
                            backgroundColor: "rgba(91,159,214,0.15)",
                            fill: true,
                            tension: 0.3,
                            pointRadius: 1,
                            borderWidth: 2,
                        },
                        {
                            label: t("stats.cumulative"),
                            data: cumulative,
                            borderColor: "#2ecc71",
                            borderDash: [4, 3],
                            fill: false,
                            tension: 0.3,
                            pointRadius: 0,
                            borderWidth: 1.5,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    scales: {
                        x: { ticks: { color: "#666", maxRotation: 45, font: { size: 10 }, maxTicksLimit: 24 }, grid: { color: "rgba(255,255,255,0.04)" } },
                        y: { ticks: { color: "#666", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
                    },
                    plugins: { legend: { labels: { color: "#888", font: { size: 11 } } } },
                },
            });
        }

        const ctryCtx = document.getElementById("chart-countries");
        if (ctryCtx && d.countries.length > 0) {
            statsChartCountries = new Chart(ctryCtx, {
                type: "bar",
                data: {
                    labels: d.countries.map(c => c.name),
                    datasets: [{
                        data: d.countries.map(c => c.count),
                        backgroundColor: d.countries.map((_, i) => extColors[i % extColors.length] + "cc"),
                        borderWidth: 0,
                        borderRadius: 3,
                    }],
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { ticks: { color: "#666", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
                        y: { ticks: { color: "#aaa", font: { size: 11 }, cursor: "pointer" }, grid: { display: false } },
                    },
                    plugins: { legend: { display: false } },
                    onClick(e, elements) {
                        if (elements.length === 0) return;
                        const idx = elements[0].index;
                        const code = d.countries[idx]?.code;
                        if (!code) return;
                        activeCountryCode = code;
                        setView("countries");
                    },
                },
            });
        }

        photoCountH.textContent = t("stats.title");
    }

    // ── Filters ───────────────────────────────────────────────────────────

    function populateSelect(el, items, placeholder, format) {
        const prev = el.value;
        el.innerHTML = `<option value="">${placeholder}</option>`;
        for (const item of items) {
            const val = format ? format(item) : item;
            el.innerHTML += `<option value="${val}">${val}</option>`;
        }
        if (prev) el.value = prev;
    }

    async function loadFilters() {
        const data = await api("GET", "/api/filters");
        populateSelect(filterCamera, data.cameras, t("filter.all"));
        populateSelect(filterLens, data.lenses, t("filter.all"));
        populateSelect(filterExt, data.extensions, t("filter.all"), e => `.${e}`);
        populateSelect(filterCountry, data.countries, t("filter.all_countries"));
        populateSelect(filterCity, data.cities, t("filter.all_cities"));
    }

    function getFilterParams() {
        const p = new URLSearchParams();
        if (activeFolderId !== null) p.set("folder_id", activeFolderId);
        if (activeCollectionId !== null) p.set("collection_id", activeCollectionId);
        const q = searchInput.value.trim();
        if (q) p.set("q", q);
        if (activeCameraBrowseId) {
            p.set("camera", activeCameraBrowseId);
        } else if (filterCamera.value) {
            p.set("camera", filterCamera.value);
        }
        if (filterLens.value) p.set("lens", filterLens.value);
        if (filterExt.value) p.set("ext", filterExt.value.replace(/^\./, ""));
        if (filterDateFrom.value) p.set("date_from", filterDateFrom.value);
        if (filterDateTo.value) p.set("date_to", filterDateTo.value);
        if (filterRating.value) p.set("rating", filterRating.value);
        if (activeTagId) p.set("tag_id", activeTagId);
        if (activeCountryCode) {
            p.set("country", activeCountryCode);
        } else if (filterCountry.value) {
            p.set("country", filterCountry.value);
        }
        if (filterCity.value) p.set("city", filterCity.value);
        if (filterGeo.value) p.set("geo", filterGeo.value);
        if (filter360.value) p.set("is_360", filter360.value === "yes" ? "1" : "0");
        return p;
    }

    // ── Photo Grid ────────────────────────────────────────────────────────

    async function loadPhotos(reset = true) {
        const usesGrid = activeView === "library" || activeView === "cleaning" || (activeView === "countries" && activeCountryCode) || (activeView === "tags" && activeTagBrowseId) || (activeView === "cameras" && activeCameraBrowseId);
        if (!usesGrid) return;
        if (loadingMore) return;
        if (reset) {
            currentPage = 1;
            hasMore = true;
            clearGrid();
        }
        if (!hasMore) return;

        do {
            loadingMore = true;
            const params = getFilterParams();
            params.set("per_page", "200");
            params.set("page", currentPage);
            const data = await api("GET", `/api/photos?${params.toString()}`);
            loadingMore = false;

            if (data.total === 0 && currentPage === 1) {
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                photoCountH.textContent = "";
                return;
            }
            emptyState.classList.add("hidden");
            photoGrid.classList.remove("hidden");
            photoCountH.textContent = t("common.items", { count: data.total.toLocaleString() });

            for (const p of data.photos) {
                const card = document.createElement("div");
                card.className = "photo-card";
                card.dataset.photoId = p.id;
                card.title = p.filename;
                let badge = "";
                if (is360Photo(p)) {
                    badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
                } else if (isVideo(p)) {
                    badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
                }
                card.innerHTML = `
                    <img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">
                    ${badge}
                    ${renderMetaBadges(p)}
                    <div class="photo-label">${p.filename}</div>
                `;
                card.addEventListener("click", () => openDetail(p.id));
                photoGrid.appendChild(card);
            }
            lucide.createIcons();
            hasMore = data.photos.length === 200;
            currentPage++;
        } while (hasMore && photoGrid.scrollHeight <= photoGrid.clientHeight);
    }

    photoGrid.addEventListener("scroll", () => {
        if (activeView !== "library" && !(activeView === "countries" && activeCountryCode) && !(activeView === "tags" && activeTagBrowseId) && !(activeView === "cameras" && activeCameraBrowseId)) return;
        const thumbPx = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || 150;
        const threshold = thumbPx * 4;
        if (photoGrid.scrollTop + photoGrid.clientHeight >= photoGrid.scrollHeight - threshold) {
            loadPhotos(false);
        }
    });

    // ── Selection & Context Menu ──────────────────────────────────────────

    function getVisiblePhotoCards() {
        const cards = Array.from(photoGrid.querySelectorAll(".photo-card[data-photo-id]"));
        if (!mapPhotos.classList.contains("hidden")) {
            cards.push(...mapPhotos.querySelectorAll(".photo-card[data-photo-id]"));
        }
        return cards;
    }

    function getPhotoCardIds() {
        return getVisiblePhotoCards().map(c => parseInt(c.dataset.photoId));
    }

    function renderSelection() {
        const hasSel = selectedIds.size > 0;
        photoGrid.classList.toggle("has-selection", hasSel);
        mapPhotos.classList.toggle("has-selection", hasSel);
        for (const card of getVisiblePhotoCards()) {
            const id = parseInt(card.dataset.photoId);
            card.classList.toggle("selected", selectedIds.has(id));
        }
        document.querySelectorAll(".cleaning-card input[type=checkbox]").forEach(cb => {
            const id = parseInt(cb.dataset.id);
            cb.checked = selectedIds.has(id);
        });

    }

    function selectPhoto(id, mode) {
        if (mode === "toggle") {
            if (selectedIds.has(id)) {
                selectedIds.delete(id);
            } else {
                selectedIds.add(id);
            }
            lastSelectedId = id;
        } else if (mode === "range") {
            if (lastSelectedId == null) {
                selectedIds.add(id);
                lastSelectedId = id;
            } else {
                const ids = getPhotoCardIds();
                const a = ids.indexOf(lastSelectedId);
                const b = ids.indexOf(id);
                if (a !== -1 && b !== -1) {
                    const start = Math.min(a, b);
                    const end = Math.max(a, b);
                    for (let i = start; i <= end; i++) selectedIds.add(ids[i]);
                }
                lastSelectedId = id;
            }
        } else if (mode === "deselect") {
            selectedIds.delete(id);
            lastSelectedId = id;
        } else if (mode === "deselect-range") {
            if (lastSelectedId == null) {
                selectedIds.delete(id);
            } else {
                const ids = getPhotoCardIds();
                const a = ids.indexOf(lastSelectedId);
                const b = ids.indexOf(id);
                if (a !== -1 && b !== -1) {
                    const start = Math.min(a, b);
                    const end = Math.max(a, b);
                    for (let i = start; i <= end; i++) selectedIds.delete(ids[i]);
                }
            }
            lastSelectedId = id;
        }
        renderSelection();
    }

    function selectAll() {
        for (const card of getVisiblePhotoCards()) {
            selectedIds.add(parseInt(card.dataset.photoId));
        }
        renderSelection();
    }

    function deselectAll() {
        selectedIds.clear();
        lastSelectedId = null;
        renderSelection();
    }

    function getPhotoIdFromEvent(e) {
        const card = e.target.closest(".photo-card[data-photo-id]");
        return card ? parseInt(card.dataset.photoId) : null;
    }

    function getDragRangeIds(startId, endId) {
        const ids = getPhotoCardIds();
        const a = ids.indexOf(startId);
        const b = ids.indexOf(endId);
        if (a === -1 || b === -1) return [];
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        return ids.slice(start, end + 1);
    }

    function updateDragHighlights() {
        for (const card of getVisiblePhotoCards()) {
            const id = parseInt(card.dataset.photoId);
            card.classList.remove("drag-highlight", "drag-highlight-deselect");
            if (dragHighlightIds.has(id)) {
                card.classList.add(dragMode === "select" ? "drag-highlight" : "drag-highlight-deselect");
            }
        }
    }

    function gridMouseDown(e) {
        if (e.button === 2) return;
        if (e.target.closest(".cleaning-check")) return;
        const id = getPhotoIdFromEvent(e);
        if (id == null) return;
        const pressedCard = e.target.closest(".photo-card[data-photo-id]");
        if (pressedCard) pressedCard.draggable = true;
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const alt = e.altKey;

        if (ctrl && !alt && !shift) {
            e.preventDefault();
            selectPhoto(id, "toggle");
            isDragging = true;
            dragStartId = id;
            dragMode = "select";
            return;
        }
        if (ctrl && !alt && shift) {
            e.preventDefault();
            selectPhoto(id, "range");
            isDragging = true;
            dragStartId = id;
            dragMode = "select";
            return;
        }
        if (ctrl && alt && !shift) {
            e.preventDefault();
            selectPhoto(id, "deselect");
            isDragging = true;
            dragStartId = id;
            dragMode = "deselect";
            return;
        }
        if (ctrl && alt && shift) {
            e.preventDefault();
            selectPhoto(id, "deselect-range");
            isDragging = true;
            dragStartId = id;
            dragMode = "deselect";
            return;
        }
    }

    function gridMouseMove(e) {
        if (!isDragging) return;
        const id = getPhotoIdFromEvent(e);
        if (id == null) return;
        dragHighlightIds = new Set(getDragRangeIds(dragStartId, id));
        updateDragHighlights();
    }

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        if (dragMode === "select") {
            for (const id of dragHighlightIds) selectedIds.add(id);
        } else {
            for (const id of dragHighlightIds) selectedIds.delete(id);
        }
        dragHighlightIds.clear();
        updateDragHighlights();
        renderSelection();
    });

    function gridClickCapture(e) {
        if (e.target.closest(".cleaning-check")) return;
        const id = getPhotoIdFromEvent(e);
        if (id == null) return;
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
            e.preventDefault();
            return;
        }
        openDetail(id);
    }

    photoGrid.addEventListener("mousedown", gridMouseDown);
    mapPhotos.addEventListener("mousedown", gridMouseDown);
    photoGrid.addEventListener("mousemove", gridMouseMove);
    mapPhotos.addEventListener("mousemove", gridMouseMove);
    photoGrid.addEventListener("click", gridClickCapture, true);
    mapPhotos.addEventListener("click", gridClickCapture, true);

    // ── Drag & Drop photos → Quick Filters (tags / collections) ───────────

    const DND_MIME = "application/x-photonic-ids";

    function gridDragStart(e) {
        const card = e.target.closest(".photo-card[data-photo-id]");
        if (!card || !card.draggable) return;
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
            e.preventDefault();
            return;
        }
        const id = parseInt(card.dataset.photoId);
        dndPhotoIds = (selectedIds.has(id) && selectedIds.size > 0)
            ? Array.from(selectedIds)
            : [id];
        card.classList.add("dragging");
        e.stopPropagation();
        try {
            e.dataTransfer.setData(DND_MIME, JSON.stringify(dndPhotoIds));
            e.dataTransfer.setData("text/plain", dndPhotoIds.join(","));
        } catch (_) {}
        e.dataTransfer.effectAllowed = "copy";
    }

    function gridDragEnd(e) {
        const card = e.target.closest(".photo-card");
        if (card) card.classList.remove("dragging");
        dndPhotoIds = [];
    }

    photoGrid.addEventListener("dragstart", gridDragStart);
    mapPhotos.addEventListener("dragstart", gridDragStart);
    photoGrid.addEventListener("dragend", gridDragEnd);
    mapPhotos.addEventListener("dragend", gridDragEnd);

    function isPhotoDnd(e) {
        try {
            return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes(DND_MIME);
        } catch (_) {
            return false;
        }
    }

    function parsePhotoDnd(e) {
        try {
            let raw = e.dataTransfer.getData(DND_MIME);
            let ids = JSON.parse(raw);
            if (Array.isArray(ids)) return ids.map(Number).filter(Number.isFinite);
        } catch (_) {}
        try {
            return (e.dataTransfer.getData("text/plain") || "")
                .split(",")
                .map(Number)
                .filter(Number.isFinite);
        } catch (_) {
            return [];
        }
    }

    // ── Context Menu ──────────────────────────────────────────────────────

    let contextMenuTargets = [];

    function gridContextMenu(e) {
        const id = getPhotoIdFromEvent(e);
        if (id == null) { hideContextMenu(); return; }
        e.preventDefault();
        contextMenuPhotoId = id;
        if (selectedIds.has(id)) {
            contextMenuTargets = Array.from(selectedIds);
        } else {
            contextMenuTargets = [id];
        }
        showContextMenu(e.clientX, e.clientY);
    }

    photoGrid.addEventListener("contextmenu", gridContextMenu);
    mapPhotos.addEventListener("contextmenu", gridContextMenu);

    function showContextMenu(x, y) {
        const count = contextMenuTargets.length;
        const header = document.getElementById("context-header");
        header.textContent = count === 1 ? t("common.item") : t("common.items", { count: count });

        contextMenu.classList.remove("hidden");
        const mw = contextMenu.offsetWidth;
        const mh = contextMenu.offsetHeight;
        contextMenu.style.left = Math.min(x, window.innerWidth - mw - 4) + "px";
        contextMenu.style.top = Math.min(y, window.innerHeight - mh - 4) + "px";

        const isCleaning = activeView === "cleaning";
        const isMulti = count > 1;

        contextMenu.querySelector('[data-action="open"]').classList.toggle("disabled", isMulti);
        contextMenu.querySelector('[data-action="select"]').classList.toggle("hidden", isMulti);
        contextMenu.querySelector('[data-action="deselect"]').classList.toggle("hidden", isMulti);
        contextMenu.querySelector('[data-action="add-tag"]').classList.toggle("hidden", isCleaning);
        contextMenu.querySelector('[data-action="remove-tags"]').classList.toggle("hidden", isCleaning);
        contextMenu.querySelector('[data-action="add-collection"]').classList.toggle("hidden", isCleaning);
        contextMenu.querySelector('[data-action="remove-collections"]').classList.toggle("hidden", isCleaning);

        const visibleItems = contextMenu.querySelectorAll(".context-item:not(.hidden)");
        visibleItems.forEach(item => item.classList.remove("striped"));
        visibleItems.forEach((item, i) => { if (i % 2 === 1) item.classList.add("striped"); });
    }

    function hideContextMenu() {
        contextMenu.classList.add("hidden");
        contextMenuPhotoId = null;
        contextMenuTargets = [];
    }

    contextMenu.addEventListener("click", (e) => {
        const item = e.target.closest(".context-item");
        if (!item || item.classList.contains("disabled")) return;
        const action = item.dataset.action;
        const targets = contextMenuTargets;

        if (action === "open") {
            if (targets.length === 1) openDetail(targets[0]);
        } else if (action === "select") {
            for (const id of targets) selectedIds.add(id);
            lastSelectedId = targets[targets.length - 1];
            renderSelection();
        } else if (action === "deselect") {
            for (const id of targets) selectedIds.delete(id);
            lastSelectedId = null;
            renderSelection();
        } else if (action === "select-all") {
            selectAll();
        } else if (action === "deselect-all") {
            deselectAll();
        } else if (action === "add-tag") {
            if (targets.length === 1) {
                openTagModal(targets[0]);
            } else {
                openTagModalBatch(targets);
            }
        } else if (action === "remove-tags") {
            removeTagsFromTargets(targets);
        } else if (action === "add-collection") {
            if (targets.length === 1) {
                openCollectionModal(targets[0]);
            } else {
                openCollectionModalBatch(targets);
            }
        } else if (action === "remove-collections") {
            removeCollectionsFromTargets(targets);
        } else if (action === "delete") {
            const ids = targets.length > 0 ? targets : Array.from(selectedIds);
            if (ids.length > 0) confirmDelete(ids);
        }
        hideContextMenu();
    });

    document.addEventListener("click", (e) => {
        if (!contextMenu.contains(e.target)) hideContextMenu();
    });
    document.addEventListener("contextmenu", (e) => {
        if (!photoGrid.contains(e.target) && !mapPhotos.contains(e.target)) hideContextMenu();
    });

    // ── Selection Bar ────────────────────────────────────────────────────

    const selectionCount = document.getElementById("selection-count");
    const btnDeselectAll = document.getElementById("btn-deselect-all");
    const btnSelectedOnly = document.getElementById("btn-selected-only");
    let selectedOnlyActive = false;

    function applySelectedOnlyFilter() {
        photoGrid.classList.toggle("selected-only", selectedOnlyActive);
        mapPhotos.classList.toggle("selected-only", selectedOnlyActive);
    }

    function toggleSelectedOnly() {
        selectedOnlyActive = !selectedOnlyActive;
        btnSelectedOnly.classList.toggle("active", selectedOnlyActive);
        mapBtnSelectedOnly.classList.toggle("active", selectedOnlyActive);
        applySelectedOnlyFilter();
    }

    btnSelectedOnly.addEventListener("click", toggleSelectedOnly);
    mapBtnSelectedOnly.addEventListener("click", toggleSelectedOnly);
    btnDeselectAll.addEventListener("click", deselectAll);
    mapBtnDeselectAll.addEventListener("click", deselectAll);

    function updateSelectionBar() {
        const n = selectedIds.size;
        if (n === 0 && selectedOnlyActive) {
            selectedOnlyActive = false;
            btnSelectedOnly.classList.remove("active");
            mapBtnSelectedOnly.classList.remove("active");
            applySelectedOnlyFilter();
        }
        selectionCount.textContent = n > 0 ? t("grid.selected", { count: n }) : "";
        selectionCount.classList.toggle("hidden", n === 0);
        btnDeselectAll.classList.toggle("hidden", n === 0);
        btnSelectedOnly.classList.toggle("hidden", n === 0);
        if (mapSelectionCount) {
            mapSelectionCount.textContent = n > 0 ? t("grid.selected", { count: n }) : "";
            mapSelectionCount.classList.toggle("hidden", n === 0);
        }
        if (mapBtnDeselectAll) mapBtnDeselectAll.classList.toggle("hidden", n === 0);
        if (mapBtnSelectedOnly) mapBtnSelectedOnly.classList.toggle("hidden", n === 0);
    }

    document.addEventListener("keydown", (e) => {
        if ((e.key === "Escape") && selectedOnlyActive) {
            selectedOnlyActive = false;
            btnSelectedOnly.classList.remove("active");
            mapBtnSelectedOnly.classList.remove("active");
            applySelectedOnlyFilter();
        }
    });

    // Patch renderSelection to also update selection bar
    const _origRenderSelection = renderSelection;
    renderSelection = function() {
        _origRenderSelection();
        updateSelectionBar();
    };

    function onFilterChange() {
        if (activeView === "locations") {
            loadMapPhotos();
        } else if (activeView === "countries" && !activeCountryCode) {
            loadCountries();
        } else if (activeView === "cameras" && !activeCameraBrowseId) {
            loadCamerasBrowse();
        } else if (activeView === "folders") {
            loadFolderBrowse();
        } else if (activeView === "tags" && !activeTagBrowseId) {
            loadTagsBrowse();
        } else {
            loadPhotos();
        }
    }

    function onSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (activeView === "locations") loadMapPhotos();
            else if (activeView === "countries" && !activeCountryCode) loadCountries();
            else if (activeView === "cameras" && !activeCameraBrowseId) loadCamerasBrowse();
            else if (activeView === "folders") loadFolderBrowse();
            else if (activeView === "tags" && !activeTagBrowseId) loadTagsBrowse();
            else loadPhotos();
        }, 300);
    }

    function clearFilters() {
        searchInput.value = "";
        filterCamera.value = "";
        filterLens.value = "";
        filterExt.value = "";
        filterDateFrom.value = "";
        filterDateTo.value = "";
        filterRating.value = "";
        filterCountry.value = "";
        filterCity.value = "";
        filterGeo.value = "";
        filter360.value = "";
        activeTagId = null;
        activeCountryCode = null;
        onFilterChange();
    }

    // ── Photo Detail ──────────────────────────────────────────────────────

    function trackPhotoIds() {
        currentPhotoIds = [];
        const container = activeView === "locations" ? mapPhotos : photoGrid;
        container.querySelectorAll(".photo-card").forEach(card => {
            const id = parseInt(card.dataset.photoId);
            if (id) currentPhotoIds.push(id);
        });
    }

    async function openDetail(photoId) {
        trackPhotoIds();
        detailIndex = currentPhotoIds.indexOf(photoId);
        detailRotation = 0;
        resetDetailZoom();
        detailThumbVersion = 0;
        detailOverlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        try {
            await loadDetail(photoId);
        } catch (e) {
            console.error("Failed to load detail:", e);
        }
    }

    function closeDetail() {
        destroy360Viewer();
        detailOverlay.classList.add("hidden");
        document.body.style.overflow = "";
        detailCurrentPhotoId = null;
        detailCurrentPhotoData = null;
        resetDetailZoom();
        if (detailMap) { detailMap.remove(); detailMap = null; }
    }

    async function navigateDetail(delta) {
        const newIdx = detailIndex + delta;
        if (newIdx < 0 || newIdx >= currentPhotoIds.length) return;
        detailIndex = newIdx;
        hideDetailMenu();
        resetDetailZoom();
        await loadDetail(currentPhotoIds[newIdx]);
    }

    async function loadDetail(photoId) {
        destroy360Viewer();
        detailCurrentPhotoId = photoId;
        const data = await api("GET", `/api/photos/${photoId}`);
        if (data.error) return;
        detailCurrentPhotoData = data;

        detailImg.src = `/api/photos/${photoId}/thumb/large?t=${detailThumbVersion}`;
        detailFname.textContent = data.filename;
        detailCounter.textContent = `${detailIndex + 1} / ${currentPhotoIds.length}`;
        applyDetailZoom();

        if (detailFooterCenter) detailFooterCenter.classList.remove("hidden");
        if (detailFooterRight) detailFooterRight.classList.remove("hidden");

        if (is360Video(data)) {
            isCurrentPhoto360Video = true;
            detail360Btn.classList.remove("hidden");
            is360Mode = true;
            detail360Btn.classList.add("active");
            detailImg.classList.add("hidden");
            detail360Viewer.classList.remove("hidden");
            initVideo360Viewer(photoId);
            if (detailFooterCenter) detailFooterCenter.classList.add("hidden");
            if (detailFooterRight) detailFooterRight.classList.add("hidden");
        } else if (isVideo(data)) {
            detail360Btn.classList.add("hidden");
            detailImg.classList.add("hidden");
            if (detailVideo) {
                detailVideo.src = `/api/photos/${photoId}/stream`;
                detailVideo.classList.remove("hidden");
            }
            if (detailFooterCenter) detailFooterCenter.classList.add("hidden");
            if (detailFooterRight) detailFooterRight.classList.add("hidden");
        } else if (is360Photo(data)) {
            if (hasWebGL()) {
                detail360Btn.classList.remove("hidden");
                is360Mode = true;
                detail360Btn.classList.add("active");
                detailImg.classList.add("hidden");
                detail360Viewer.classList.remove("hidden");
                initPannellum(photoId);
            } else {
                detail360Btn.classList.add("hidden");
                showToast(
                    `This is a 360° photo but WebGL is disabled.<br><a href="edge://settings/system" target="_blank">Enable hardware acceleration</a> in Edge and restart to view it.`,
                    { icon: "monitor-x", duration: 8000 }
                );
            }
            if (detailFooterCenter) detailFooterCenter.classList.add("hidden");
            if (detailFooterRight) detailFooterRight.classList.add("hidden");
        } else {
            detail360Btn.classList.add("hidden");
        }

        lucide.createIcons();

        const rows = [
            ["File", data.filename],
            ["Path", data.path],
            ["Size", formatSize(data.size)],
            ["Dimensions", data.width && data.height ? `${data.width} × ${data.height}` : null],
            ["Format", data.extension ? data.extension.toUpperCase() : null],
            ["Camera", [data.camera_make, data.camera_model].filter(Boolean).join(" ")],
            ["Lens", data.lens],
            ["Focal Length", data.focal_length],
            ["Aperture", data.aperture ? `f/${data.aperture}` : null],
            ["Shutter Speed", data.shutter_speed],
            ["ISO", data.iso],
            ["Date Taken", formatExifDateStr(data.date_taken)],
            ["Created", formatEpochStr(data.created_date)],
            ["Modified", formatEpochStr(data.modified_date)],
        ];

        detailMeta.innerHTML = "";
        for (const [label, value] of rows) {
            if (!value) continue;
            detailMeta.innerHTML += `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-value" title="${value}">${value}</span></div>`;
        }

        if (data.latitude != null && data.longitude != null) {
            detailMapSec.classList.remove("hidden");
            detailCoords.textContent = `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
            setTimeout(() => {
                if (detailMap) detailMap.remove();
                detailMap = L.map("detail-map", { zoomControl: false, attributionControl: false }).setView([data.latitude, data.longitude], 13);
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(detailMap);
                L.marker([data.latitude, data.longitude]).addTo(detailMap);
                setTimeout(() => detailMap.invalidateSize(), 100);
            }, 50);
        } else {
            detailMapSec.classList.add("hidden");
        }

        const collectionData = await api("GET", `/api/photos/${photoId}/collections`);
        const collectionsList = Array.isArray(collectionData) ? collectionData : [];
        detailCollections.innerHTML = "";
        for (const c of collectionsList) {
            const color = c.color || TAG_COLORS[Math.abs(hashStr(c.name)) % TAG_COLORS.length];
            const pill = document.createElement("span");
            pill.className = "collection-pill";
            pill.style.setProperty("--collection-color", color);
            pill.title = "Click to remove";
            
            const icon = c.icon ? `<i data-lucide="${c.icon}"></i>` : `<i data-lucide="library"></i>`;
            pill.innerHTML = `${icon}${c.name}`;
            
            pill.addEventListener("click", async () => {
                await api("DELETE", `/api/photos/${photoId}/collections/${c.id}`);
                await loadDetail(photoId);
                loadSidebar();
            });
            detailCollections.appendChild(pill);
        }
        const addCollBtn = document.createElement("span");
        addCollBtn.className = "collection-pill tag-add";
        addCollBtn.innerHTML = `<i data-lucide="plus"></i> ${t("detail.add_to_collection")}`;
        addCollBtn.addEventListener("click", () => openCollectionModal(photoId));
        detailCollections.appendChild(addCollBtn);
        lucide.createIcons({ root: detailCollections });

        const tagData = await api("GET", `/api/photos/${photoId}/tags`);
        const tagList = Array.isArray(tagData) ? tagData : [];

        detailTags.innerHTML = "";
        for (const tobj of tagList) {
            const color = tobj.color || TAG_COLORS[Math.abs(hashStr(tobj.name)) % TAG_COLORS.length];
            const pill = document.createElement("span");
            pill.className = "tag-pill";
            pill.textContent = tobj.name;
            pill.style.setProperty("--tag-color", color);
            pill.title = t("detail.click_to_remove");
            pill.addEventListener("click", async () => {
                await api("DELETE", `/api/photos/${photoId}/tags/${tobj.id}`);
                await loadDetail(photoId);
            });
            detailTags.appendChild(pill);
        }

        const addBtn = document.createElement("span");
        addBtn.className = "tag-pill tag-add";
        addBtn.innerHTML = `<i data-lucide="plus"></i> ${t("detail.add_tag")}`;
        addBtn.addEventListener("click", () => openTagModal(photoId));
        detailTags.appendChild(addBtn);
        lucide.createIcons({ root: detailTags });

        detailRating.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            star.className = "star" + (i <= (data.rating || 0) ? " filled" : "");
            star.textContent = "★";
            star.dataset.value = i;
            star.addEventListener("click", async () => {
                await api("POST", `/api/photos/${photoId}/rate`, { rating: i });
                await loadDetail(photoId);
            });
            detailRating.appendChild(star);
        }
    }

    function formatSize(bytes) {
        if (!bytes) return null;
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    }

    function parseExifDate(exifStr) {
        if (!exifStr) return null;
        const parts = exifStr.trim().split(" ");
        if (parts.length !== 2) return null;
        const dateParts = parts[0].split(":");
        const timeParts = parts[1].split(":");
        if (dateParts.length === 3 && timeParts.length === 3) {
            return new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2]),
                parseInt(timeParts[0]),
                parseInt(timeParts[1]),
                parseInt(timeParts[2])
            );
        }
        return null;
    }

    function formatDateTime(date) {
        if (!date || isNaN(date.getTime())) return null;
        return date.toLocaleString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    function formatExifDateStr(exifStr) {
        const date = parseExifDate(exifStr);
        return date ? formatDateTime(date) : exifStr;
    }

    function formatEpochStr(epochStr) {
        if (!epochStr) return null;
        const t = parseFloat(epochStr);
        if (isNaN(t)) return epochStr;
        const date = new Date(t * 1000);
        return formatDateTime(date);
    }

    // ── Color Palette Helper ────────────────────────────────────────────────

    function renderColorPalette(container, selectedColor, onSelect) {
        container.innerHTML = "";
        for (const c of TAG_COLORS) {
            const swatch = document.createElement("div");
            swatch.className = "tag-color-swatch" + (c === selectedColor ? " active" : "");
            swatch.style.background = c;
            swatch.addEventListener("click", () => {
                container.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
                swatch.classList.add("active");
                onSelect(c);
            });
            container.appendChild(swatch);
        }
    }

    // ── Icon Picker Helper ──────────────────────────────────────────────────

    const COLLECTION_ICONS = [
        "folder", "folder-open", "image", "images", "camera", "aperture",
        "heart", "star", "bookmark", "archive", "album", "grid-3x3",
        "layers", "map", "globe", "compass", "clock", "calendar",
        "music", "film", "book-open", "briefcase", "home", "users",
        "palette", "sparkles", "zap", "flame", "diamond", "crown",
        "gem", "trophy", "target", "rocket", "sun", "moon",
        "cloud", "tree-pine", "mountain", "waves", "feather", "pen-tool"
    ];

    function renderIconPicker(container, selectedIcon, onSelect) {
        container.innerHTML = "";
        for (const name of COLLECTION_ICONS) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "icon-picker-item" + (name === selectedIcon ? " active" : "");
            btn.title = name;
            btn.innerHTML = `<i data-lucide="${name}"></i>`;
            btn.addEventListener("click", () => {
                container.querySelectorAll(".icon-picker-item").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                onSelect(name);
            });
            container.appendChild(btn);
        }
        lucide.createIcons({ root: container });
    }

    function updateIconSelectedDisplay(iconName) {
        const name = iconName || "library";
        collectionIconSelected.innerHTML = `<i data-lucide="${name}"></i> <span>${name}</span>`;
        collectionIconInput.value = name;
        lucide.createIcons({ root: collectionIconSelected });
    }

    // ── Tag Modal ──────────────────────────────────────────────────────────

    async function openTagModal(photoId) {
        tagModalPhotoId = photoId;
        tagModalBatchIds = null;
        tagModalExistingTags = await api("GET", "/api/tags");
        tagDialogTitle.textContent = t("tag_dialog.add_tag");
        tagInput.value = "";
        tagModalSelectedColor = TAG_COLORS[6];
        tagColorPicker.value = tagModalSelectedColor;
        tagColorHex.value = tagModalSelectedColor.toUpperCase();

        renderColorPalette(tagColorPalette, tagModalSelectedColor, (c) => {
            tagModalSelectedColor = c;
            tagColorPicker.value = c;
            tagColorHex.value = c.toUpperCase();
        });

        tagColorPicker.addEventListener("input", onTagPickerInput);
        tagColorHex.addEventListener("input", onTagHexInput);

        setTagTab("existing");
        renderTagExistingList();
        tagDialog.classList.remove("hidden");
    }

    function setTagTab(tab) {
        const isNew = tab === "new";
        document.getElementById("tag-existing-list").hidden = isNew;
        document.getElementById("tag-create-section").hidden = !isNew;
        document.querySelectorAll("#tag-dialog-tabs .dialog-tab").forEach((b) => {
            b.classList.toggle("active", b.dataset.tab === tab);
        });
        tagDialogOk.classList.toggle("hidden", !isNew);
        tagDialogCancel.textContent = isNew ? t("confirm.cancel") : t("common.close");
        if (isNew) {
            tagInput.focus();
        } else {
            tagInput.blur();
        }
    }

    function onTagPickerInput(e) {
        tagModalSelectedColor = e.target.value;
        tagColorHex.value = e.target.value.toUpperCase();
        tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
    }

    function onTagHexInput(e) {
        let v = e.target.value.trim();
        if (!v.startsWith("#")) v = "#" + v;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            tagModalSelectedColor = v;
            tagColorPicker.value = v;
            tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
        }
    }

    function renderTagExistingList() {
        let assignedNames = new Set();
        if (!tagModalBatchIds) {
            const photoTags = detailTags.querySelectorAll(".tag-pill:not(.tag-add)");
            assignedNames = new Set(Array.from(photoTags).map(p => p.textContent.trim().replace(" ✕", "")));
        }
        const filtered = tagModalExistingTags.filter(t => !assignedNames.has(t.name));
        if (filtered.length === 0) {
            tagExistingList.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);padding:4px">No more tags to add</div>';
            return;
        }
        tagExistingList.innerHTML = "";
        for (const t of filtered) {
            const el = document.createElement("div");
            el.className = "tag-existing-item";
            const color = t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
            el.style.setProperty("--tag-color", color);
            el.innerHTML = t.name;
            el.addEventListener("click", async () => {
                if (tagModalBatchIds) {
                    for (const pid of tagModalBatchIds) {
                        await api("POST", `/api/photos/${pid}/tags`, { tag_id: t.id });
                    }
                } else {
                    await api("POST", `/api/photos/${tagModalPhotoId}/tags`, { tag_id: t.id });
                    await loadDetail(tagModalPhotoId);
                }
                tagDialog.classList.add("hidden");
                if (activeView === "tags") loadTagsBrowse();
                loadSidebar();
                renderSelection();
            });
            tagExistingList.appendChild(el);
        }
    }

    function hexToRgb(hex) {
        const h = hex.replace("#", "");
        return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
    }

    function hashStr(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
        return h;
    }

    async function submitTagModal() {
        const name = tagInput.value.trim();
        if (!name) return;

        let existing = tagModalExistingTags.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (!existing) {
            const color = tagModalSelectedColor;
            const res = await api("POST", "/api/tags", { name, color });
            existing = { id: res.id, name, color };
        } else if (!existing.color) {
            await api("PUT", `/api/tags/${existing.id}`, { color: tagModalSelectedColor });
        }

        const ids = tagModalBatchIds || [tagModalPhotoId];
        for (const pid of ids) {
            await api("POST", `/api/photos/${pid}/tags`, { tag_id: existing.id });
        }
        tagDialog.classList.add("hidden");
        if (!tagModalBatchIds) await loadDetail(tagModalPhotoId);
        if (activeView === "tags") loadTagsBrowse();
        loadSidebar();
        renderSelection();
    }

    async function openTagModalBatch(photoIds) {
        tagModalBatchIds = photoIds;
        tagModalPhotoId = null;
        tagModalExistingTags = await api("GET", "/api/tags");
        tagDialogTitle.textContent = t("tag_dialog.add_tag_to", { count: photoIds.length });
        tagInput.value = "";
        tagModalSelectedColor = TAG_COLORS[6];
        tagColorPicker.value = tagModalSelectedColor;
        tagColorHex.value = tagModalSelectedColor.toUpperCase();

        renderColorPalette(tagColorPalette, tagModalSelectedColor, (c) => {
            tagModalSelectedColor = c;
            tagColorPicker.value = c;
            tagColorHex.value = c.toUpperCase();
        });

        tagColorPicker.addEventListener("input", onTagPickerInput);
        tagColorHex.addEventListener("input", onTagHexInput);

        setTagTab("existing");
        renderTagExistingList();
        tagDialog.classList.remove("hidden");
    }

    function closeTagModal() {
        tagColorPicker.removeEventListener("input", onTagPickerInput);
        tagColorHex.removeEventListener("input", onTagHexInput);
        tagDialog.classList.add("hidden");
    }

    // ── Collection Modals ──────────────────────────────────────────────────

    async function openCollectionDialog(collection = null) {
        // Fetch all collections for parent selection
        const collections = await api("GET", "/api/collections/tree");
        collectionParentSelect.innerHTML = '<option value="">(None)</option>';
        function recurseAdd(nodes) {
            for (const n of nodes) {
                if (collection && collection.id === n.id) continue;
                const opt = document.createElement("option");
                opt.value = n.id;
                opt.textContent = "   ".repeat(n.depth) + n.name;
                collectionParentSelect.appendChild(opt);
                if (n.children) recurseAdd(n.children);
            }
        }
        recurseAdd(collections);

        if (collection) {
            collectionDialogTitle.textContent = t("collection_dialog.edit");
            collectionInput.value = collection.name || "";
            collectionParentSelect.value = collection.parent_id || "";
            collectionModalSelectedColor = collection.color || TAG_COLORS[6];
            collectionDialogOk.dataset.id = collection.id;
        } else {
            collectionDialogTitle.textContent = pendingCollectionAssignIds ? t("collection_dialog.add_to") : t("collection_dialog.add");
            collectionInput.value = "";
            collectionParentSelect.value = "";
            collectionModalSelectedColor = TAG_COLORS[6];
            delete collectionDialogOk.dataset.id;
        }

        const assignMode = !collection && !!pendingCollectionAssignIds;
        document.getElementById("collection-dialog-tabs").hidden = !!collection;
        if (collection) {
            document.getElementById("collection-existing-section").hidden = true;
            document.getElementById("collection-create-section").hidden = false;
            collectionDialogOk.classList.remove("hidden");
            collectionDialogCancel.textContent = t("confirm.cancel");
        } else {
            setCollectionTab(assignMode ? "existing" : "new");
        }

        const currentIcon = (collection && collection.icon) ? collection.icon : "library";
        renderIconPicker(collectionIconPicker, currentIcon, (name) => {
            updateIconSelectedDisplay(name);
        });
        updateIconSelectedDisplay(currentIcon);
        collectionColorPicker.value = collectionModalSelectedColor;
        collectionColorHex.value = collectionModalSelectedColor.toUpperCase();

        renderColorPalette(collectionColorPalette, collectionModalSelectedColor, (c) => {
            collectionModalSelectedColor = c;
            collectionColorPicker.value = c;
            collectionColorHex.value = c.toUpperCase();
        });

        function onCollPickerInput(e) {
            collectionModalSelectedColor = e.target.value;
            collectionColorHex.value = e.target.value.toUpperCase();
            collectionColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
        }
        function onCollHexInput(e) {
            let v = e.target.value.trim();
            if (!v.startsWith("#")) v = "#" + v;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                collectionModalSelectedColor = v;
                collectionColorPicker.value = v;
                collectionColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
            }
        }
        collectionColorPicker.addEventListener("input", onCollPickerInput);
        collectionColorHex.addEventListener("input", onCollHexInput);

        collectionDialog.classList.remove("hidden");
        if (!assignMode) collectionInput.focus();
    }

    function setCollectionTab(tab) {
        const isExisting = tab === "existing";
        document.getElementById("collection-existing-section").hidden = !isExisting;
        document.getElementById("collection-create-section").hidden = isExisting;
        document.querySelectorAll("#collection-dialog-tabs .dialog-tab").forEach((b) => {
            b.classList.toggle("active", b.dataset.tab === tab);
        });
        collectionDialogOk.classList.toggle("hidden", isExisting);
        collectionDialogCancel.textContent = isExisting ? t("common.close") : t("confirm.cancel");
        if (isExisting) {
            collectionInput.blur();
        } else {
            collectionInput.focus();
        }
    }

    function onCollectionDialogCancel() {
        collectionDialog.classList.add("hidden");
        pendingCollectionAssignIds = null;
    }

    collectionDialogCancel.addEventListener("click", onCollectionDialogCancel);
    document.getElementById("collection-dialog-close").addEventListener("click", onCollectionDialogCancel);
    document.querySelectorAll("#collection-dialog-tabs .dialog-tab").forEach((btn) => {
        btn.addEventListener("click", () => setCollectionTab(btn.dataset.tab));
    });

    collectionDialogOk.addEventListener("click", async () => {
        const name = collectionInput.value.trim();
        if (!name) return;
        const payload = {
            name,
            color: collectionModalSelectedColor,
            icon: collectionIconInput.value.trim() || null,
            parent_id: collectionParentSelect.value ? parseInt(collectionParentSelect.value) : null
        };
        const id = collectionDialogOk.dataset.id;
        if (id) {
            await api("PUT", `/api/collections/${id}`, payload);
        } else {
            const res = await api("POST", "/api/collections", payload);
            if (res && res.ok && res.id && pendingCollectionAssignIds) {
                for (const pid of pendingCollectionAssignIds) {
                    await api("POST", `/api/photos/${pid}/collections`, { collection_id: res.id });
                }
                pendingCollectionAssignIds = null;
            }
        }
        collectionDialog.classList.add("hidden");
        loadSidebar();
        if (activeView === "collections") loadCollectionsBrowse();
        if (!settingsPage.classList.contains("hidden")) {
            const activeSection = settingsPageNav.querySelector(".settings-nav-item.active");
            if (activeSection) {
                const target = activeSection.dataset.section;
                if (target === "settings-tags-p") loadSettingsTags();
                else if (target === "settings-collections-p") loadSettingsCollections();
                else if (target === "settings-folders-p") loadSettingsFolders();
            }
        }
    });

    async function openCollectionModal(photoId) {
        collectionModalPhotoId = photoId;
        collectionModalBatchIds = null;
        pendingCollectionAssignIds = [photoId];
        await openAssignCollectionsDialog();
    }

    async function openCollectionModalBatch(photoIds) {
        collectionModalBatchIds = photoIds;
        collectionModalPhotoId = null;
        pendingCollectionAssignIds = photoIds;
        await openAssignCollectionsDialog();
    }

    async function openAssignCollectionsDialog() {
        collectionModalExistingCollections = await api("GET", "/api/collections");
        renderCollectionExistingList();
        await openCollectionDialog();
    }

    function renderCollectionExistingList() {
        if (collectionModalExistingCollections.length === 0) {
            collectionExistingList.innerHTML = `<div style="font-size:12px;color:var(--text-secondary);padding:4px">${t("collections.none_found")}</div>`;
            return;
        }
        collectionExistingList.innerHTML = "";
        for (const c of collectionModalExistingCollections) {
            const el = document.createElement("div");
            el.className = "tag-existing-item";
            const color = c.color || TAG_COLORS[Math.abs(hashStr(c.name)) % TAG_COLORS.length];
            el.style.setProperty("--tag-color", color);
            el.innerHTML = c.name;
            el.addEventListener("click", async () => {
                const ids = pendingCollectionAssignIds || [];
                for (const pid of ids) {
                    await api("POST", `/api/photos/${pid}/collections`, { collection_id: c.id });
                }
                pendingCollectionAssignIds = null;
                collectionDialog.classList.add("hidden");
                if (activeView === "collections") loadCollectionsBrowse();
                loadSidebar();
                renderSelection();
            });
            collectionExistingList.appendChild(el);
        }
    }

    async function removeCollectionsFromTargets(targets) {
        const collections = await api("GET", "/api/collections");
        if (collections.length === 0) return;
        
        let html = `<div style="padding: 10px;">${t("collection_dialog.select_to_remove")}</div><div class="tag-existing-list">`;
        for (const c of collections) {
            const color = c.color || TAG_COLORS[Math.abs(hashStr(c.name)) % TAG_COLORS.length];
            html += `<div class="tag-existing-item" data-id="${c.id}" style="--tag-color: ${color}">${c.name}</div>`;
        }
        html += '</div>';

        const confirmDialogWrapper = document.getElementById("confirm-dialog");
        document.getElementById("confirm-title").textContent = t("collection_dialog.remove_title");
        document.getElementById("confirm-message").innerHTML = html;
        document.getElementById("confirm-ok").classList.add("hidden"); // We will just use the list
        document.getElementById("confirm-cancel").textContent = t("common.close");
        confirmDialogWrapper.classList.remove("hidden");

        const listItems = confirmDialogWrapper.querySelectorAll(".tag-existing-item");
        listItems.forEach(el => {
            el.addEventListener("click", async () => {
                const cid = parseInt(el.dataset.id);
                for (const id of targets) {
                    await api("DELETE", `/api/photos/${id}/collections/${cid}`);
                }
                confirmDialogWrapper.classList.add("hidden");
                document.getElementById("confirm-ok").classList.remove("hidden");
                if (activeView === "collections") loadCollectionsBrowse();
                loadSidebar();
            });
        });
    }

    // ── Dialog ────────────────────────────────────────────────────────────

    function openDialog() {
        dialog.classList.remove("hidden");
        folderInput.value = "";
        folderInput.focus();
    }

    function closeDialog() {
        dialog.classList.add("hidden");
    }

    async function addFolder() {
        const path = folderInput.value.trim();
        if (!path) return;
        closeDialog();
        await api("POST", "/api/folders", { path });
        await loadSidebar();
        await loadFilters();
        btnRescan.disabled = false;
        scanStatus.textContent = t("scan.starting");
        const res = await api("POST", "/api/scan", { path });
        if (res.error === "scan_already_running") {
            scanStatus.textContent = t("scan.running_next");
            pollScan();
            return;
        }
        scanPollCount = 0;
        pollScan();
    }

    async function rescanAll() {
        btnRescan.disabled = true;
        scanStatus.textContent = t("scan.starting");
        const res = await api("POST", "/api/scan", { path: "all" });
        if (res.error === "scan_already_running") {
            scanStatus.textContent = t("scan.running");
            btnRescan.disabled = false;
            pollScan();
            return;
        }
        scanPollCount = 0;
        pollScan();
    }

    // ── Scan polling ──────────────────────────────────────────────────────

    async function pollScan() {
        if (scanPolling) return;
        scanPolling = true;
        pollScanLoop();
    }

    async function pollScanLoop() {
        let data;
        try {
            data = await api("GET", "/api/scan/status");
        } catch (e) {
            setTimeout(pollScanLoop, 2000);
            return;
        }
        if (data.running && data.total > 0) {
            const pct = Math.round((data.done / data.total) * 100);
            scanProgress.classList.remove("hidden");
            scanFill.style.width = pct + "%";
            scanStatus.textContent = data.cancel
                ? t("scan.cancelling", { done: data.done.toLocaleString(), total: data.total.toLocaleString() })
                : t("scan.progress", { done: data.done.toLocaleString(), total: data.total.toLocaleString(), pct: pct });
            btnRescan.disabled = true;
            if (btnScanCancel) btnScanCancel.classList.toggle("hidden", !!data.cancel);
            scanPollCount++;
            const now = Date.now();
            if (now - lastScanRefresh >= 5000) {
                lastScanRefresh = now;
                try {
                    await loadFilters();
                    await checkStatus();
                } catch (e) { /* non-fatal */ }
            }
            setTimeout(pollScanLoop, 500);
        } else if (data.running) {
            scanProgress.classList.remove("hidden");
            scanFill.style.width = "0%";
            scanStatus.textContent = t("scan.preparing");
            btnRescan.disabled = true;
            if (btnScanCancel) btnScanCancel.classList.remove("hidden");
            setTimeout(pollScanLoop, 500);
        } else {
            scanPollCount = 0;
            lastScanRefresh = 0;
            scanProgress.classList.add("hidden");
            if (btnScanCancel) btnScanCancel.classList.add("hidden");
            scanFill.style.width = "0%";
            scanStatus.textContent = data.cancelled ? t("scan.cancelled") : "";
            if (data.cancelled) setTimeout(() => { if (!scanStatus.textContent.startsWith(t("scan.starting"))) scanStatus.textContent = ""; }, 4000);
            btnRescan.disabled = false;
            document.querySelectorAll(".settings-row-btn.scan").forEach(btn => {
                btn.disabled = false;
                btn.querySelector("svg")?.classList.remove("spinning");
            });
            try {
                onFilterChange();
                await loadSidebar();
                await loadFilters();
                await checkStatus();
            } catch (e) { /* keep flag clear even if refresh fails */ }
            scanPolling = false;
        }
    }

    // ── Event listeners ───────────────────────────────────────────────────

    navItems.forEach(li => {
        li.addEventListener("click", () => setView(li.dataset.view));
    });
    btnToggleFilters.addEventListener("click", () => {
        filterDrawer.classList.toggle("drawer-closed");
        btnToggleFilters.classList.toggle("active");
    });
    searchInput.addEventListener("input", onSearch);
    filterCamera.addEventListener("change", onFilterChange);
    filterLens.addEventListener("change", onFilterChange);
    filterExt.addEventListener("change", onFilterChange);
    filterDateFrom.addEventListener("change", onFilterChange);
    filterDateTo.addEventListener("change", onFilterChange);
    filterRating.addEventListener("change", onFilterChange);
    filterCountry.addEventListener("change", onFilterChange);
    filterCity.addEventListener("change", onFilterChange);
    filterGeo.addEventListener("change", onFilterChange);
    filter360.addEventListener("change", onFilterChange);
    btnClearFilters.addEventListener("click", clearFilters);
    btnAddFolder.addEventListener("click", openDialog);
    btnAddFolderSb.addEventListener("click", openDialog);
    btnRescan.addEventListener("click", rescanAll);
    if (btnScanCancel) btnScanCancel.addEventListener("click", async () => {
        btnScanCancel.classList.add("hidden");
        await api("POST", "/api/scan/cancel");
    });
    btnOk.addEventListener("click", addFolder);
    btnCancel.addEventListener("click", closeDialog);
    document.getElementById("folder-dialog-close").addEventListener("click", closeDialog);
    folderInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addFolder(); });

    tagDialogOk.addEventListener("click", submitTagModal);
    tagDialogCancel.addEventListener("click", closeTagModal);
    document.querySelectorAll("#tag-dialog-tabs .dialog-tab").forEach((btn) => {
        btn.addEventListener("click", () => setTagTab(btn.dataset.tab));
    });
    document.getElementById("tag-dialog-close").addEventListener("click", closeTagModal);
    tagInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitTagModal(); });
    tagDialog.addEventListener("click", (e) => { if (e.target === tagDialog) closeTagModal(); });

    cleaningTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            cleaningTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            if (activeView === "cleaning") loadCleaningTab();
        });
    });
    btnAnalyze.addEventListener("click", startAnalysis);

    // ── Map resize handle ─────────────────────────────────────────────────

    (function() {
        let dragging = false, startY = 0, startTopH = 0, startBotH = 0;
        mapResize.addEventListener("mousedown", (e) => {
            e.preventDefault();
            dragging = true;
            startY = e.clientY;
            startTopH = mapView.offsetHeight;
            startBotH = mapPhotos.offsetHeight;
            document.body.style.cursor = "ns-resize";
            document.body.style.userSelect = "none";
        });
        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const delta = e.clientY - startY;
            const newTop = Math.max(100, startTopH + delta);
            const newBot = Math.max(60, startBotH - delta);
            mapView.style.flex = "none";
            mapView.style.height = newTop + "px";
            mapPhotos.style.height = newBot + "px";
            if (map) map.invalidateSize();
        });
        document.addEventListener("mouseup", () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        });
    })();

    detailClose.addEventListener("click", closeDetail);
    detail360Btn.addEventListener("click", toggle360);
    detailFullscreenBtn.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => {
        if (document.fullscreenElement) {
            detailFullscreenBtn.innerHTML = '<i data-lucide="minimize"></i>';
            detailFullscreenBtn.title = "Exit fullscreen";
        } else {
            detailFullscreenBtn.innerHTML = '<i data-lucide="maximize"></i>';
            detailFullscreenBtn.title = "Fullscreen";
        }
        lucide.createIcons({ root: detailFullscreenBtn });
    });

    const detailMoreBtn = document.getElementById("detail-more");
    const detailMoreMenu = document.getElementById("detail-more-menu");

    function hideDetailMenu() {
        detailMoreMenu.classList.add("hidden");
    }

    detailMoreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        detailMoreMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
        if (!detailMoreMenu.classList.contains("hidden") && !e.target.closest(".detail-menu-wrap")) {
            hideDetailMenu();
        }
    });

    detailMoreMenu.addEventListener("click", async (e) => {
        const item = e.target.closest(".detail-menu-item");
        if (!item || !detailCurrentPhotoId) return;
        const action = item.dataset.action;
        hideDetailMenu();
        if (action === "open") {
            api("POST", `/api/photos/${detailCurrentPhotoId}/open`);
        } else if (action === "reveal") {
            api("POST", `/api/photos/${detailCurrentPhotoId}/reveal`);
        } else if (action === "copy-path") {
            if (detailCurrentPhotoData?.path) await navigator.clipboard.writeText(detailCurrentPhotoData.path);
        } else if (action === "delete") {
            const deleted = await confirmDelete([detailCurrentPhotoId]);
            if (deleted) closeDetail();
        }
    });

    detailPrev.addEventListener("click", () => navigateDetail(-1));
    detailNext.addEventListener("click", () => navigateDetail(1));
    detailRotateCW.addEventListener("click", async () => {
        if (!detailCurrentPhotoId) return;
        detailRotateCW.disabled = true;
        detailRotateCCW.disabled = true;
        const res = await api("POST", `/api/photos/${detailCurrentPhotoId}/rotate`, { degrees: 90 });
        if (res.ok) {
            detailThumbVersion++;
            detailRotation = 0;
            loadDetail(detailCurrentPhotoId);
            detailMeta.querySelectorAll(".meta-row").forEach(row => {
                if (row.querySelector(".meta-label")?.textContent === "Dimensions") {
                    row.querySelector(".meta-value").textContent = `${res.width} × ${res.height}`;
                }
            });
        }
        detailRotateCW.disabled = false;
        detailRotateCCW.disabled = false;
    });
    detailRotateCCW.addEventListener("click", async () => {
        if (!detailCurrentPhotoId) return;
        detailRotateCW.disabled = true;
        detailRotateCCW.disabled = true;
        const res = await api("POST", `/api/photos/${detailCurrentPhotoId}/rotate`, { degrees: -90 });
        if (res.ok) {
            detailThumbVersion++;
            detailRotation = 0;
            loadDetail(detailCurrentPhotoId);
            detailMeta.querySelectorAll(".meta-row").forEach(row => {
                if (row.querySelector(".meta-label")?.textContent === "Dimensions") {
                    row.querySelector(".meta-value").textContent = `${res.width} × ${res.height}`;
                }
            });
        }
        detailRotateCW.disabled = false;
        detailRotateCCW.disabled = false;
    });

    function applyDetailZoom() {
        const tx = `translate(${detailPanX}px, ${detailPanY}px)`;
        detailImg.style.transform = `rotate(${detailRotation}deg) scale(${detailZoom / 100}) ${tx}`;
        detailZoomLabel.textContent = detailZoom + "%";
        detailImg.classList.toggle("zoomed", detailZoom > 100);
    }

    function resetDetailZoom() {
        detailZoom = 100;
        detailPanX = 0;
        detailPanY = 0;
        detailZoomSlider.value = 100;
        applyDetailZoom();
    }

    detailZoomSlider.addEventListener("input", () => {
        detailZoom = parseInt(detailZoomSlider.value);
        if (detailZoom <= 100) { detailPanX = 0; detailPanY = 0; }
        applyDetailZoom();
    });

    detailStage.addEventListener("wheel", (e) => {
        if (detailOverlay.classList.contains("hidden")) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 40 : -40;
        detailZoom = Math.max(100, Math.min(500, detailZoom + delta));
        detailZoomSlider.value = detailZoom;
        if (detailZoom <= 100) { detailPanX = 0; detailPanY = 0; }
        applyDetailZoom();
    }, { passive: false });

    detailImg.addEventListener("mousedown", (e) => {
        if (detailZoom <= 100) return;
        e.preventDefault();
        detailDragging = true;
        detailDragStartX = e.clientX - detailPanX;
        detailDragStartY = e.clientY - detailPanY;
    });

    document.addEventListener("mousemove", (e) => {
        if (!detailDragging) return;
        detailPanX = e.clientX - detailDragStartX;
        detailPanY = e.clientY - detailDragStartY;
        applyDetailZoom();
    });

    document.addEventListener("mouseup", () => { detailDragging = false; });

    detailOverlay.addEventListener("click", (e) => { if (e.target === detailOverlay) closeDetail(); });
    document.addEventListener("keydown", (e) => {
        if (!detailOverlay.classList.contains("hidden")) {
            if (e.key === "Escape") closeDetail();
            if (e.key === "ArrowLeft") navigateDetail(-1);
            if (e.key === "ArrowRight") navigateDetail(1);
        } else if (e.key === "Escape") {
            if (selectedIds.size > 0) deselectAll();
            hideContextMenu();
        } else if (e.ctrlKey && e.key === "a") {
            const usesGrid = activeView === "library" || activeView === "cleaning" || (activeView === "countries" && activeCountryCode) || (activeView === "tags" && activeTagBrowseId) || (activeView === "cameras" && activeCameraBrowseId);
            const usesMap = activeView === "locations";
            if ((usesGrid && !photoGrid.classList.contains("hidden")) || usesMap) {
                e.preventDefault();
                for (const c of getVisiblePhotoCards()) selectedIds.add(parseInt(c.dataset.photoId));
                renderSelection();
            }
        }
    });

    // ── Thumb size slider + Ctrl+Scroll ────────────────────────────────────

    const thumbSlider  = document.getElementById("thumb-size");
    const thumbMin = 30;
    const thumbMax = 450;
    const thumbDefault = 150;

    function setThumbSize(px) {
        px = Math.round(Math.max(thumbMin, Math.min(thumbMax, px)));
        const prev = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
        if (px !== prev) {
            photoGrid.classList.remove("zoom-pulse");
            void photoGrid.offsetWidth;
            photoGrid.classList.add("zoom-pulse");
            setTimeout(() => photoGrid.classList.remove("zoom-pulse"), 300);
        }
        document.documentElement.style.setProperty("--thumb-size", px + "px");
        document.documentElement.classList.toggle("thumbs-tiny", px <= 90);
        thumbSlider.value = px;
        localStorage.setItem("photonic.thumbnailSize", px);
        if (currentLayout === "masonry") requestAnimationFrame(() => layoutMasonry());
        if (hasMore && !loadingMore) {
            requestAnimationFrame(() => {
                if (photoGrid.scrollTop + photoGrid.clientHeight >= photoGrid.scrollHeight - 10) loadPhotos(false);
            });
        }
    }

    thumbSlider.addEventListener("input", () => setThumbSize(+thumbSlider.value));

    const btnZoomOut = document.getElementById("btn-zoom-out");
    if (btnZoomOut) {
        btnZoomOut.addEventListener("click", () => {
            const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
            setThumbSize(cur - 20);
        });
    }

    const btnZoomIn = document.getElementById("btn-zoom-in");
    if (btnZoomIn) {
        btnZoomIn.addEventListener("click", () => {
            const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
            setThumbSize(cur + 20);
        });
    }

    photoGrid.addEventListener("wheel", (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
        setThumbSize(cur + (e.deltaY < 0 ? 20 : -20));
    }, { passive: false });

    // ── Layout Toggle (Grid / Masonry) ────────────────────────────────────

    const btnLayoutGrid    = document.getElementById("btn-layout-grid");
    const btnLayoutMasonry = document.getElementById("btn-layout-masonry");
    let currentLayout = "grid";
    let masonryResizeObs = null;

    function layoutMasonry() {
        if (currentLayout !== "masonry") return;
        const cards = photoGrid.querySelectorAll(".photo-card, .country-card");
        if (cards.length === 0) return;

        const gap = 6;
        const pad = 12;
        const headerBar = document.getElementById("header-photo-grid");
        const topPad = pad + (headerBar ? headerBar.offsetHeight : 0);
        const thumbPx = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || 150;
        const contentWidth = photoGrid.clientWidth - pad * 2;
        const cols = Math.max(1, Math.floor((contentWidth + gap) / (thumbPx + gap)));
        const colWidth = (contentWidth - gap * (cols - 1)) / cols;
        const colHeights = new Array(cols).fill(0);

        for (const card of cards) {
            card.style.width = colWidth + "px";
            let shortest = 0;
            for (let c = 1; c < cols; c++) {
                if (colHeights[c] < colHeights[shortest]) shortest = c;
            }
            card.style.left = (pad + shortest * (colWidth + gap)) + "px";
            card.style.top = (topPad + colHeights[shortest]) + "px";
            colHeights[shortest] += card.offsetHeight + gap;
        }

        const maxH = Math.max(...colHeights) + topPad + pad;
        photoGrid.style.height = maxH + "px";
    }

    function setLayout(mode) {
        currentLayout = mode;
        photoGrid.classList.toggle("masonry", mode === "masonry");
        btnLayoutGrid.classList.toggle("active", mode === "grid");
        btnLayoutMasonry.classList.toggle("active", mode === "masonry");
        localStorage.setItem("layout-mode", mode);
        localStorage.setItem("photonic.defaultView", mode);

        if (mode === "masonry") {
            photoGrid.style.height = "";
            requestAnimationFrame(() => layoutMasonry());
            if (!masonryResizeObs) {
                masonryResizeObs = new ResizeObserver(() => layoutMasonry());
                masonryResizeObs.observe(photoGrid);
            }
        } else {
            photoGrid.style.height = "";
            if (masonryResizeObs) { masonryResizeObs.disconnect(); masonryResizeObs = null; }
            const cards = photoGrid.querySelectorAll(".photo-card, .country-card");
            for (const card of cards) {
                card.style.position = "";
                card.style.left = "";
                card.style.top = "";
                card.style.width = "";
            }
        }
    }

    const _origLoadPhotos = loadPhotos;
    const _origClearGrid = clearGrid;
    clearGrid = function() {
        _origClearGrid();
        photoGrid.style.height = "";
    };

    btnLayoutGrid.addEventListener("click", () => setLayout("grid"));
    btnLayoutMasonry.addEventListener("click", () => setLayout("masonry"));

    photoGrid.addEventListener("load", (e) => {
        if (currentLayout === "masonry" && e.target.tagName === "IMG") layoutMasonry();
    }, true);

    const savedLayout = localStorage.getItem("photonic.defaultView") || localStorage.getItem("layout-mode") || "grid";
    setLayout(savedLayout);

    const savedThumbSize = localStorage.getItem("photonic.thumbnailSize");
    setThumbSize(savedThumbSize ? +savedThumbSize : thumbDefault);

    // ── Settings Page ────────────────────────────────────────────────────

    const settingsPage      = document.getElementById("settings-page");
    const settingsPageNav   = settingsPage.querySelector(".settings-nav-items");
    const settingsSections  = settingsPage.querySelectorAll(".settings-section");
    const btnSettings       = document.getElementById("btn-settings");
    const settingsBack      = document.getElementById("settings-back");
    let previousView        = "library";

    function openSettings() {
        previousView = activeView;
        document.getElementById("empty-state").classList.add("hidden");
        document.getElementById("photo-grid").classList.add("hidden");
        document.getElementById("stats-view").classList.add("hidden");
        document.getElementById("map-view").classList.add("hidden");
        document.getElementById("map-resize").classList.add("hidden");
        document.getElementById("map-photos").classList.add("hidden");
        mapPhotosHeader.classList.add("hidden");
        cleaningToolbar.classList.add("hidden");
        document.getElementById("sidebar").classList.add("hidden");
        document.getElementById("filter-drawer").classList.add("hidden");
        settingsPage.classList.remove("hidden");
        btnSettings.classList.add("active");

        settingsPageNav.querySelectorAll(".settings-nav-item").forEach(t => t.classList.remove("active"));
        settingsPageNav.querySelector('.settings-nav-item[data-section="settings-application"]').classList.add("active");
        settingsSections.forEach(s => s.classList.add("hidden"));
        document.getElementById("settings-application").classList.remove("hidden");
        renderApplicationSettings();
        lucide.createIcons();
    }

    function closeSettings() {
        settingsPage.classList.add("hidden");
        btnSettings.classList.remove("active");
        document.getElementById("sidebar").classList.remove("hidden");
        document.getElementById("filter-drawer").classList.remove("hidden");
        setView(previousView);
    }

    btnSettings.addEventListener("click", () => {
        if (!settingsPage.classList.contains("hidden")) closeSettings();
        else openSettings();
    });
    settingsBack.addEventListener("click", closeSettings);

    settingsPageNav.querySelectorAll(".settings-nav-item").forEach(item => {
        item.addEventListener("click", () => {
            settingsPageNav.querySelectorAll(".settings-nav-item").forEach(t => t.classList.remove("active"));
            item.classList.add("active");
            const target = item.dataset.section;
            settingsSections.forEach(s => s.classList.add("hidden"));
            document.getElementById(target).classList.remove("hidden");
            if (target === "settings-application") renderApplicationSettings();
            else if (target === "settings-tags-p") loadSettingsTags();
            else if (target === "settings-collections-p") loadSettingsCollections();
            else if (target === "settings-folders-p") loadSettingsFolders();
            lucide.createIcons();
        });
    });

    // ── Application Settings ──────────────────────────────────────────────

    const THEME_VARS = ["bg-primary", "bg-secondary", "bg-tertiary", "accent", "border", "text-primary", "text-secondary"];

    const THEME_PALETTES = [
        { id: "midnight",      name: "Midnight",      mode: "dark",  colors: { "bg-primary": "#0A0D3A", "bg-secondary": "#0F1248", "bg-tertiary": "#181C58", "accent": "#28A8D8", "border": "#2A2E68", "text-primary": "#E6E6F0", "text-secondary": "#8488A8" } },
        { id: "phoenix-dark",  name: "Phoenix Dark",  mode: "dark",  colors: { "bg-primary": "#0c0604", "bg-secondary": "#241209", "bg-tertiary": "#301A0D", "accent": "#FF7A29", "border": "#3D2413", "text-primary": "#F5E9DF", "text-secondary": "#A88B76" } },
        { id: "forest",        name: "Forest",        mode: "dark",  colors: { "bg-primary": "#0c0604", "bg-secondary": "#10291F", "bg-tertiary": "#173527", "accent": "#4ADE80", "border": "#1F4030", "text-primary": "#E3F0E8", "text-secondary": "#82A893" } },
        { id: "daylight",      name: "Daylight",      mode: "light", colors: { "bg-primary": "#F4F5FA", "bg-secondary": "#FFFFFF", "bg-tertiary": "#EAECF4", "accent": "#2563EB", "border": "#D8DBE8", "text-primary": "#191D30", "text-secondary": "#686E8C" } },
        { id: "phoenix-light", name: "Phoenix Light", mode: "light", colors: { "bg-primary": "#FBF3EA", "bg-secondary": "#FFFFFF", "bg-tertiary": "#F6E8D8", "accent": "#E85D04", "border": "#EBDCC9", "text-primary": "#2B1A10", "text-secondary": "#8C7361" } },
        { id: "forest-light",  name: "Forest Light",  mode: "light", colors: { "bg-primary": "#f4faf4", "bg-secondary": "#FFFFFF", "bg-tertiary": "#dff6d8", "accent": "#39df76", "border": "#cdebc9", "text-primary": "#162b10", "text-secondary": "#658c61" } }
    ];

    function renderApplicationSettings() {
        const el = document.getElementById("settings-application");
        const confirmDelete = localStorage.getItem("photonic.confirmDelete") !== "false";
        const showExts = localStorage.getItem("photonic.showExtensions") === "true";
        const thumbSize = parseInt(localStorage.getItem("photonic.thumbnailSize") || "150");
        const defaultView = localStorage.getItem("photonic.defaultView") || "grid";
        const clusterThreshold = parseInt(localStorage.getItem("photonic.clusterThreshold") || "500");
        const clusterGlobalThreshold = parseInt(localStorage.getItem("photonic.clusterGlobalThreshold") || "5000");
        const savedPalette = localStorage.getItem("photonic.palette");

        el.innerHTML = `
            <div class="settings-app-info">
                <div class="settings-app-icon"><i data-lucide="aperture"></i></div>
                <div class="settings-app-details">
                    <div class="settings-app-name">PHOTONIC</div>
                    <span class="settings-app-version" id="settings-page-version"></span>
                    <p class="settings-app-desc">${t("settings.app.desc")}</p>
                    <button class="settings-action-btn" id="setting-open-changelog"><i data-lucide="scroll-text"></i> ${t("settings.app.whats_new")}</button>
                </div>
            </div>

            <div class="settings-card settings-card-gradient">
                <div class="settings-card-header">
                    <i data-lucide="arrow-up-circle"></i>
                    <h3>${t("settings.updates.title")}</h3>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label" id="setting-update-status">${describeUpdateState(lastUpdateState)}</div>
                        <div class="setting-desc">${lastUpdateState && lastUpdateState.current_version ? t("settings.updates.current_version", { v: lastUpdateState.current_version }) : ""}${t("settings.updates.desc")}</div>
                    </div>
                    <div class="setting-control" style="display:flex; gap:8px;">
                        <button class="settings-action-btn" id="setting-update-check"><i data-lucide="refresh-cw"></i> ${t("settings.updates.check")}</button>
                        <a class="settings-action-btn" href="${RELEASES_PAGE}" target="_blank" rel="noopener"><i data-lucide="download"></i> ${t("settings.updates.releases")}</a>
                    </div>
                </div>
            </div>

            <div class="settings-card settings-card-gradient">
                <div class="settings-card-header">
                    <i data-lucide="sliders-horizontal"></i>
                    <h3>${t("settings.general.title")}</h3>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.general.confirm_delete")}</div>
                        <div class="setting-desc">${t("settings.general.confirm_delete_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <label class="toggle-switch">
                            <input type="checkbox" id="setting-confirm-delete" ${confirmDelete ? "checked" : ""}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.general.show_extensions")}</div>
                        <div class="setting-desc">${t("settings.general.show_extensions_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <label class="toggle-switch">
                            <input type="checkbox" id="setting-show-extensions" ${showExts ? "checked" : ""}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label" data-i18n="settings.general.language">${t("settings.general.language")}</div>
                        <div class="setting-desc" data-i18n="settings.general.language_desc">${t("settings.general.language_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <div class="lang-settings-wrap">
                            <button class="settings-select lang-settings-btn" id="setting-language" type="button"></button>
                            <div class="lang-menu lang-settings-menu hidden" id="setting-lang-menu"></div>
                        </div>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.general.telemetry")}</div>
                        <div class="setting-desc">${t("settings.general.telemetry_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <label class="toggle-switch">
                            <input type="checkbox" id="setting-telemetry" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="settings-card settings-card-gradient">
                <div class="settings-card-header">
                    <i data-lucide="layout-grid"></i>
                    <h3>${t("settings.display.title")}</h3>
                </div>
                <div class="settings-sub-header">
                    <span class="section-dot"></span>
                    <h4>${t("settings.display.general_sub")}</h4>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.thumb_label")}</div>
                        <div class="setting-desc">${t("settings.display.thumb_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <div class="settings-range-wrap">
                            <input type="range" class="settings-range" id="setting-thumb-size" min="60" max="450" value="${thumbSize}">
                            <input type="number" class="settings-range-label settings-range-input" id="setting-thumb-size-label" value="${thumbSize}" min="60" max="450" step="1" aria-label="${t("settings.display.thumb_label")}">
                            <span class="settings-range-unit">px</span>
                        </div>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.default_view")}</div>
                        <div class="setting-desc" id="default-view-desc">${t("settings.display.default_view_desc")}${defaultView === "masonry" ? " " + t("settings.display.default_view_masonry") : ""}</div>
                    </div>
                    <div class="setting-control">
                        <div class="settings-layout-toggle" id="setting-default-view">
                            <button class="layout-btn${defaultView === "grid" ? " active" : ""}" data-view="grid" title="${t("settings.display.grid")}"><i data-lucide="grid-3x3"></i></button>
                            <button class="layout-btn${defaultView === "masonry" ? " active" : ""}" data-view="masonry" title="${t("settings.display.masonry")}"><i data-lucide="layout-dashboard"></i><span class="btn-beta-tag">BETA</span></button>
                        </div>
                    </div>
                </div>
                <div class="settings-sub-header">
                    <span class="section-dot"></span>
                    <h4>${t("settings.display.locations_sub")}</h4>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.cluster_label")}</div>
                        <div class="setting-desc" id="setting-cluster-threshold-desc">${t("settings.display.cluster_desc")}<br>${t("settings.display.cluster_1")}</div>
                    </div>
                    <div class="setting-control">
                        <div class="settings-range-wrap">
                            <input type="range" class="settings-range" id="setting-cluster-threshold" min="1" max="5000" step="1" value="${clusterThreshold}">
                            <input type="number" class="settings-range-label settings-range-input" id="setting-cluster-threshold-label" value="${clusterThreshold}" min="1" max="5000" step="1" aria-label="${t("settings.display.cluster_label")}">
                        </div>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.cluster_global_label")}</div>
                        <div class="setting-desc" id="setting-cluster-global-desc">${t("settings.display.cluster_global_desc")}<br>${t("settings.display.cluster_global_ex")}</div>
                    </div>
                    <div class="setting-control">
                        <div class="settings-range-wrap">
                            <input type="range" class="settings-range" id="setting-cluster-global" min="300" max="5000" step="1" value="${clusterGlobalThreshold}">
                            <input type="number" class="settings-range-label settings-range-input" id="setting-cluster-global-label" value="${clusterGlobalThreshold}" min="300" max="5000" step="1" aria-label="${t("settings.display.cluster_global_label")}">
                        </div>
                    </div>
                </div>
                <div class="settings-sub-header">
                    <span class="section-dot"></span>
                    <h4>${t("settings.display.appearance_sub")}</h4>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.palettes_label")}</div>
                        <div class="setting-desc">${t("settings.display.palettes_desc")}</div>
                    </div>
                    <div class="setting-control palette-groups">
                        ${["dark", "light"].map(mode => `
                            <div class="palette-group">
                                <span class="palette-group-label">${mode === "dark" ? t("settings.display.dark") : t("settings.display.light")}</span>
                                <div class="palette-row">
                                    ${THEME_PALETTES.filter(p => p.mode === mode).map(p => `
                                        <button class="palette-swatch${savedPalette === p.id ? " active" : ""}" data-palette="${p.id}" title="${p.name}">
                                            <span class="palette-dots">
                                                <i style="background:${p.colors["bg-secondary"]}"></i>
                                                <i style="background:${p.colors["bg-tertiary"]}"></i>
                                                <i style="background:${p.colors["accent"]}"></i>
                                            </span>
                                            <span class="palette-name">${p.name}</span>
                                        </button>
                                    `).join("")}
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.bg_primary")}</div>
                        <div class="setting-desc">${t("settings.display.bg_primary_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <input type="color" class="settings-color" id="setting-bg-primary" value="${localStorage.getItem("photonic.bg-primary") || "#0A0D3A"}">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.bg_secondary")}</div>
                        <div class="setting-desc">${t("settings.display.bg_secondary_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <input type="color" class="settings-color" id="setting-bg-secondary" value="${localStorage.getItem("photonic.bg-secondary") || "#0F1248"}">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.bg_tertiary")}</div>
                        <div class="setting-desc">${t("settings.display.bg_tertiary_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <input type="color" class="settings-color" id="setting-bg-tertiary" value="${localStorage.getItem("photonic.bg-tertiary") || "#181C58"}">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.accent")}</div>
                        <div class="setting-desc">${t("settings.display.accent_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <input type="color" class="settings-color" id="setting-accent" value="${localStorage.getItem("photonic.accent") || "#28A8D8"}">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.borders")}</div>
                        <div class="setting-desc">${t("settings.display.borders_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <input type="color" class="settings-color" id="setting-border" value="${localStorage.getItem("photonic.border") || "#2A2E68"}">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.text_primary")}</div>
                        <div class="setting-desc">${t("settings.display.text_primary_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <input type="color" class="settings-color" id="setting-text-primary" value="${localStorage.getItem("photonic.text-primary") || "#E6E6F0"}">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.text_secondary")}</div>
                        <div class="setting-desc">${t("settings.display.text_secondary_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <input type="color" class="settings-color" id="setting-text-secondary" value="${localStorage.getItem("photonic.text-secondary") || "#8488A8"}">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.display.reset_colors")}</div>
                        <div class="setting-desc">${t("settings.display.reset_colors_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <button class="settings-action-btn" id="setting-reset-colors"><i data-lucide="rotate-ccw"></i> ${t("settings.display.reset")}</button>
                    </div>
                </div>
            </div>

            <div class="settings-card settings-card-gradient">
                <div class="settings-card-header">
                    <i data-lucide="database"></i>
                    <h3>${t("settings.data.title")}</h3>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <div class="setting-label">${t("settings.data.rescan_label")}</div>
                        <div class="setting-desc">${t("settings.data.rescan_desc")}</div>
                    </div>
                    <div class="setting-control">
                        <button class="settings-action-btn" id="setting-rescan"><i data-lucide="refresh-cw"></i> ${t("settings.data.rescan")}</button>
                    </div>
                </div>
            </div>
        `;

        const versionBadge = document.getElementById("version-badge");
        const ver = document.getElementById("settings-page-version");
        if (ver && versionBadge) ver.textContent = versionBadge.textContent.trim();

        document.getElementById("setting-confirm-delete").addEventListener("change", (e) => {
            localStorage.setItem("photonic.confirmDelete", e.target.checked);
        });
        document.getElementById("setting-show-extensions").addEventListener("change", (e) => {
            localStorage.setItem("photonic.showExtensions", e.target.checked);
        });

        const telemetryToggle = document.getElementById("setting-telemetry");
        let telemetryDirty = false;
        telemetryToggle.addEventListener("change", (e) => {
            telemetryDirty = true;
            api("POST", "/api/settings/telemetry", { enabled: e.target.checked });
        });
        api("GET", "/api/settings/telemetry").then(d => {
            if (!telemetryDirty && d && typeof d.enabled === "boolean") telemetryToggle.checked = d.enabled;
        }).catch(() => {});

        const langSelect = document.getElementById("setting-language");
        if (langSelect) {
            langSelect.innerHTML = I18n.availableLanguages.map(l =>
                `<option value="${l.code}">${l.name}</option>`
            ).join("");
            langSelect.value = I18n.getCurrent();
            langSelect.addEventListener("change", () => {
                I18n.setLanguage(langSelect.value).then(() => {
                    refreshAfterLangChange();
                });
            });
        }

        const thumbSlider = document.getElementById("setting-thumb-size");
        const thumbLabel = document.getElementById("setting-thumb-size-label");
        const mainThumb = document.getElementById("thumb-size");
        function applyThumbSize(v) {
            v = Math.max(60, Math.min(450, +v || 60));
            thumbSlider.value = v;
            thumbLabel.value = v;
            localStorage.setItem("photonic.thumbnailSize", v);
            document.documentElement.style.setProperty("--thumb-size", v + "px");
            document.documentElement.classList.toggle("thumbs-tiny", +v <= 90);
            if (mainThumb) mainThumb.value = v;
        }
        thumbSlider.addEventListener("input", (e) => applyThumbSize(e.target.value));
        thumbLabel.addEventListener("change", (e) => applyThumbSize(e.target.value));

        document.querySelectorAll("#setting-default-view .layout-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const v = btn.dataset.view;
                localStorage.setItem("photonic.defaultView", v);
                setLayout(v);
                document.querySelectorAll("#setting-default-view .layout-btn").forEach(b => b.classList.toggle("active", b === btn));
                const desc = document.getElementById("default-view-desc");
                if (desc) desc.textContent = t("settings.display.default_view_desc") + (v === "masonry" ? " " + t("settings.display.default_view_masonry") : "");
            });
        });

        const clusterSlider = document.getElementById("setting-cluster-threshold");
        const clusterLabel = document.getElementById("setting-cluster-threshold-label");
        const clusterDesc = document.getElementById("setting-cluster-threshold-desc");
        const clusterDescBase = clusterDesc ? clusterDesc.innerHTML : "";
        if (clusterSlider && clusterLabel) {
            const setClusterWarn = (v) => {
                clusterLabel.classList.toggle("warn", +v > 100);
                if (clusterDesc) {
                    clusterDesc.innerHTML = clusterDescBase + (+v > 100
                        ? `<div class="setting-desc-warn">⚠ ${t("settings.display.cluster_warn")}</div>`
                        : "");
                }
            };
            const applyCluster = (v) => {
                v = Math.max(1, Math.min(5000, +v || 1));
                clusterSlider.value = v;
                clusterLabel.value = v;
                localStorage.setItem("photonic.clusterThreshold", v);
                setClusterWarn(v);
                if (activeView === "locations") { lastMapQueryUrl = null; loadMapPhotos(); }
            };
            clusterSlider.addEventListener("input", (e) => applyCluster(e.target.value));
            clusterLabel.addEventListener("change", (e) => applyCluster(e.target.value));
            setClusterWarn(clusterSlider.value);
        }

        const clusterGlobalSlider = document.getElementById("setting-cluster-global");
        const clusterGlobalLabel = document.getElementById("setting-cluster-global-label");
        const clusterGlobalDesc = document.getElementById("setting-cluster-global-desc");
        const clusterGlobalDescBase = clusterGlobalDesc ? clusterGlobalDesc.innerHTML : "";
        if (clusterGlobalSlider && clusterGlobalLabel) {
            const setClusterGlobalWarn = (v) => {
                clusterGlobalLabel.classList.toggle("warn", +v > 1000);
                if (clusterGlobalDesc) {
                    clusterGlobalDesc.innerHTML = clusterGlobalDescBase + (+v > 1000
                        ? `<div class="setting-desc-warn">⚠ ${t("settings.display.cluster_global_warn")}</div>`
                        : "");
                }
            };
            const applyClusterGlobal = (v) => {
                v = Math.max(300, Math.min(5000, +v || 300));
                clusterGlobalSlider.value = v;
                clusterGlobalLabel.value = v;
                localStorage.setItem("photonic.clusterGlobalThreshold", v);
                setClusterGlobalWarn(v);
                if (activeView === "locations") { lastMapQueryUrl = null; loadMapPhotos(); }
            };
            clusterGlobalSlider.addEventListener("input", (e) => applyClusterGlobal(e.target.value));
            clusterGlobalLabel.addEventListener("change", (e) => applyClusterGlobal(e.target.value));
            setClusterGlobalWarn(clusterGlobalSlider.value);
        }

        document.getElementById("setting-rescan").addEventListener("click", () => {
            const btn = document.getElementById("btn-rescan");
            if (btn) btn.click();
        });

        document.getElementById("setting-update-check").addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-circle"></i> ${t("settings.updates.checking")}`;
            lucide.createIcons({ root: btn });
            try {
                const data = await api("POST", "/api/update/check");
                applyUpdateState(data, false);
                if (data.update_available) {
                    showToast(
                        t("update.view_release_toast", { v: `v${data.latest_version}`, url: data.release_url || RELEASES_PAGE }),
                        { icon: "arrow-up-circle", duration: 12000 }
                    );
                }
            } catch {
                applyUpdateState({ ...(lastUpdateState || {}), error: "network" }, false);
            }
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="refresh-cw"></i> ${t("settings.updates.check")}`;
            lucide.createIcons({ root: btn });
        });

        for (const name of THEME_VARS) {
            document.getElementById(`setting-${name}`).addEventListener("input", (e) => {
                applyThemeColor(name, e.target.value);
                localStorage.setItem("photonic.palette", "custom");
                document.querySelectorAll(".palette-swatch").forEach(s => s.classList.remove("active"));
            });
        }

        document.querySelectorAll(".palette-swatch").forEach(swatch => {
            swatch.addEventListener("click", () => {
                const palette = THEME_PALETTES.find(p => p.id === swatch.dataset.palette);
                if (!palette) return;
                for (const [name, value] of Object.entries(palette.colors)) {
                    applyThemeColor(name, value);
                    document.getElementById(`setting-${name}`).value = value;
                }
                localStorage.setItem("photonic.palette", palette.id);
                document.querySelectorAll(".palette-swatch").forEach(s => s.classList.toggle("active", s === swatch));
            });
        });

        const swatches = Array.from(document.querySelectorAll(".palette-swatch"));
        if (swatches.length) {
            const maxW = Math.max(...swatches.map(s => s.offsetWidth));
            swatches.forEach(s => { s.style.minWidth = maxW + "px"; });
        }

        document.getElementById("setting-reset-colors").addEventListener("click", () => {
            const midnight = THEME_PALETTES.find(p => p.id === "midnight");
            for (const [name, value] of Object.entries(midnight.colors)) {
                localStorage.removeItem(`photonic.${name}`);
                document.getElementById(`setting-${name}`).value = value;
                applyThemeColor(name, value);
            }
            localStorage.setItem("photonic.palette", "midnight");
            document.querySelectorAll(".palette-swatch").forEach(s => s.classList.toggle("active", s.dataset.palette === "midnight"));
        });

        document.getElementById("setting-open-changelog").addEventListener("click", openChangelog);
    }

    function applyThemeColor(name, value) {
        localStorage.setItem(`photonic.${name}`, value);
        document.documentElement.style.setProperty(`--${name}`, value);
    }

    // ── Settings — Tags ────────────────────────────────────────────────────

    function settingsTagColor(t) {
        return t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
    }

    async function loadSettingsTags() {
        const tags = await api("GET", "/api/tags");
        const el = document.getElementById("settings-tags-p");
        document.getElementById("settings-tags-count").textContent = tags.length;

        el.innerHTML = `
            <div class="settings-section-title">${t("settings.tags")}</div>
            <div class="settings-section-desc">${t("settings.tags.desc")}</div>
            <div class="settings-section-header">
                <div></div>
                <button class="settings-action-btn primary" id="btn-add-tag-setting"><i data-lucide="plus"></i> ${t("settings.tags.new")}</button>
            </div>
            <div class="settings-card">
                <div id="settings-tags-list"></div>
            </div>
        `;
        const listEl = document.getElementById("settings-tags-list");

        document.getElementById("btn-add-tag-setting").addEventListener("click", () => {
            if (document.getElementById("new-tag-row")) return;
            const row = document.createElement("div");
            row.className = "settings-row";
            row.id = "new-tag-row";
            row.innerHTML = `
                <input type="color" value="${TAG_COLORS[3]}" id="new-tag-color">
                <input type="text" placeholder="${t("tag_dialog.name_placeholder")}" id="new-tag-name">
                <div class="settings-row-actions">
                    <button class="settings-row-btn" title="${t("settings.tags.create")}" id="new-tag-ok"><i data-lucide="check"></i></button>
                    <button class="settings-row-btn delete" title="${t("confirm.cancel")}" id="new-tag-cancel"><i data-lucide="x"></i></button>
                </div>
            `;
            listEl.prepend(row);
            lucide.createIcons({ root: row });
            const nameInput = row.querySelector("#new-tag-name");
            nameInput.focus();
            const cancel = () => row.remove();
            const submit = async () => {
                const name = nameInput.value.trim();
                if (!name) { nameInput.focus(); return; }
                await api("POST", "/api/tags", { name, color: row.querySelector("#new-tag-color").value });
                loadSettingsTags();
                loadSidebar();
            };
            row.querySelector("#new-tag-ok").addEventListener("click", submit);
            row.querySelector("#new-tag-cancel").addEventListener("click", cancel);
            nameInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") submit();
                else if (e.key === "Escape") cancel();
            });
        });

        if (!tags.length) {
            listEl.innerHTML = `<div class="settings-list-empty"><i data-lucide="tag"></i><div>${t("settings.tags.none")}</div></div>`;
            lucide.createIcons({ root: el });
            return;
        }

        for (const tag of tags) {
            const color = settingsTagColor(tag);
            const row = document.createElement("div");
            row.className = "settings-row";
            row.innerHTML = `
                <span class="tag-dot" style="background:${color}"></span>
                <input type="color" value="${color}" data-tag-id="${tag.id}">
                <input type="text" value="${tag.name}" data-tag-id="${tag.id}">
                <div class="settings-row-actions">
                    <button class="settings-row-btn delete" title="${t("settings.tags.delete")}" data-tag-id="${tag.id}"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            listEl.appendChild(row);
        }
        lucide.createIcons({ root: el });

        listEl.querySelectorAll('input[type="color"]').forEach(inp => {
            inp.addEventListener("input", async () => {
                const tid = parseInt(inp.dataset.tagId);
                await api("PUT", `/api/tags/${tid}`, { color: inp.value });
                inp.closest(".settings-row").querySelector(".tag-dot").style.background = inp.value;
                loadSidebar();
            });
        });

        listEl.querySelectorAll('input[type="text"]').forEach(inp => {
            let debounce = null;
            inp.addEventListener("input", () => {
                clearTimeout(debounce);
                debounce = setTimeout(async () => {
                    const tid = parseInt(inp.dataset.tagId);
                    const newName = inp.value.trim();
                    if (!newName) return;
                    await api("PUT", `/api/tags/${tid}`, { name: newName });
                    loadSidebar();
                }, 400);
            });
        });

        listEl.querySelectorAll(".settings-row-btn.delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const tid = parseInt(btn.dataset.tagId);
                const name = btn.closest(".settings-row").querySelector('input[type="text"]').value;
                if (!await showConfirm(t("settings.tags.delete_title"), t("settings.tags.delete_msg", { name }), t("confirm.delete"))) return;
                await api("DELETE", `/api/tags/${tid}`);
                loadSettingsTags();
                loadSidebar();
            });
        });
    }

    // ── Settings — Collections ─────────────────────────────────────────────

    async function loadSettingsCollections() {
        const collections = await api("GET", "/api/collections/tree");
        const el = document.getElementById("settings-collections-p");

        let totalCount = 0;
        function countNodes(nodes) { for (const n of nodes) { totalCount++; if (n.children) countNodes(n.children); } }
        countNodes(collections);
        document.getElementById("settings-collections-count").textContent = totalCount;

        el.innerHTML = `
            <div class="settings-section-title">${t("settings.collections")}</div>
            <div class="settings-section-desc">${t("settings.collections.desc")}</div>
            <div class="settings-section-header">
                <div></div>
                <button class="settings-action-btn primary" id="btn-add-collection-setting"><i data-lucide="plus"></i> ${t("settings.collections.new")}</button>
            </div>
            <div class="settings-card">
                <div id="settings-collections-list"></div>
            </div>
        `;

        document.getElementById("btn-add-collection-setting").addEventListener("click", () => openCollectionDialog());

        const listEl = document.getElementById("settings-collections-list");

        if (!collections.length) {
            listEl.innerHTML = `<div class="settings-list-empty"><i data-lucide="layers"></i><div>${t("settings.collections.none")}</div></div>`;
            lucide.createIcons({ root: el });
            return;
        }

        function renderNode(n) {
            const color = n.color || TAG_COLORS[Math.abs(hashStr(n.name)) % TAG_COLORS.length];
            const row = document.createElement("div");
            row.className = "settings-row";
            const indent = n.depth > 0 ? `margin-left: ${n.depth * 20}px;` : "";
            const iconName = n.icon || "library";
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0; ${indent}">
                    <span class="tag-dot collection-dot" style="background:${color}"><i data-lucide="${iconName}"></i></span>
                    <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${n.name}</span>
                </div>
                <div class="settings-row-actions">
                    <button class="settings-row-btn settings-row-btn-edit" title="${t("settings.collections.edit_title")}" data-id="${n.id}"><i data-lucide="pencil"></i></button>
                    <button class="settings-row-btn delete" title="${t("settings.collections.delete_title")}" data-id="${n.id}"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            listEl.appendChild(row);

            row.querySelector(".settings-row-btn-edit").addEventListener("click", () => openCollectionDialog(n));
            row.querySelector(".settings-row-btn.delete").addEventListener("click", async () => {
                if (!await showConfirm(t("settings.collections.delete_title"), t("settings.collections.delete_msg", { name: n.name }), t("confirm.delete"))) return;
                await api("DELETE", `/api/collections/${n.id}`);
                loadSettingsCollections();
                loadSidebar();
            });

            if (n.children) {
                for (const c of n.children) renderNode(c);
            }
        }

        for (const c of collections) renderNode(c);
        lucide.createIcons({ root: el });
    }

    // ── Settings — Folders ─────────────────────────────────────────────────

    async function loadSettingsFolders() {
        const folders = await api("GET", "/api/folders");
        const el = document.getElementById("settings-folders-p");
        document.getElementById("settings-folders-count").textContent = folders.length;

        el.innerHTML = `
            <div class="settings-section-title">${t("settings.folders")}</div>
            <div class="settings-section-desc">${t("settings.folders.desc")}</div>
            <div class="settings-card">
                <div id="settings-folders-list"></div>
            </div>
        `;
        const listEl = document.getElementById("settings-folders-list");

        if (!folders.length) {
            listEl.innerHTML = `<div class="settings-list-empty"><i data-lucide="folder-open"></i><div>${t("settings.folders.none")}</div></div>`;
            lucide.createIcons({ root: el });
            return;
        }

        // Build tree: a folder is nested under its longest path prefix
        const nodes = folders.map(f => ({ ...f, key: f.path.replace(/[\\/]+$/, "").toLowerCase(), children: [], _collapsed: false }));
        const parented = new Set();
        for (const n of nodes) {
            let best = null;
            for (const c of nodes) {
                if (c === n) continue;
                if (n.key.startsWith(c.key + "\\") || n.key.startsWith(c.key + "/")) {
                    if (!best || c.key.length > best.key.length) best = c;
                }
            }
            if (best) { best.children.push(n); parented.add(n); }
        }
        nodes.sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));
        for (const n of nodes) n.children.sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));

        function applyCollapse(n) {
            for (const c of n.children) {
                c.row.classList.toggle("hidden", n._collapsed);
                applyCollapse(c);
            }
        }

        function renderFolderNode(node, depth) {
            const row = document.createElement("div");
            row.className = "settings-row settings-folder-row";
            row.style.paddingLeft = (12 + depth * 24) + "px";
            const hasChildren = node.children.length > 0;
            row.innerHTML = `
                ${hasChildren
                    ? `<button class="folder-toggle" title="${t("settings.folders.collapse")}"><i data-lucide="chevron-down"></i></button>`
                    : '<span class="folder-toggle-spacer"></span>'}
                <i data-lucide="${hasChildren ? "folder-open" : "folder"}" style="width:16px;height:16px;color:var(--accent);flex-shrink:0"></i>
                <span class="settings-folder-path" title="${node.path}">${node.path}</span>
                <span class="settings-folder-count" title="${t("common.items", { count: (node.photo_count || 0).toLocaleString() })}">${(node.photo_count || 0).toLocaleString()}</span>
                <div class="settings-row-actions">
                    <button class="settings-row-btn scan" title="${t("settings.folders.scan")}" data-folder-path="${node.path}"><i data-lucide="refresh-cw"></i></button>
                    <button class="settings-row-btn delete" title="${t("settings.folders.remove")}" data-folder-id="${node.id}"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            listEl.appendChild(row);
            node.row = row;

            if (hasChildren) {
                const toggle = row.querySelector(".folder-toggle");
                toggle.addEventListener("click", () => {
                    node._collapsed = !node._collapsed;
                    toggle.classList.toggle("collapsed", node._collapsed);
                    applyCollapse(node);
                });
            }

            for (const c of node.children) renderFolderNode(c, depth + 1);
            return row;
        }

        for (const n of nodes) {
            if (!parented.has(n)) renderFolderNode(n, 0);
        }
        lucide.createIcons({ root: el });

        listEl.querySelectorAll(".settings-row-btn.scan").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (btn.disabled) return;
                btn.disabled = true;
                btn.querySelector("svg")?.classList.add("spinning");
                const res = await api("POST", "/api/scan", { path: btn.dataset.folderPath });
                if (res.error === "scan_already_running") {
                    btn.disabled = false;
                    btn.querySelector("svg")?.classList.remove("spinning");
                    scanStatus.textContent = t("settings.folders.scan_running");
                    pollScan();
                    return;
                }
                scanPollCount = 0;
                pollScan();
            });
        });

        listEl.querySelectorAll(".settings-row-btn.delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const fid = parseInt(btn.dataset.folderId);
                const path = btn.closest(".settings-row").querySelector(".settings-folder-path").textContent;
                if (!await showConfirm(t("settings.folders.remove_title"), t("settings.folders.remove_msg", { path }), t("settings.folders.remove"))) return;
                await api("DELETE", `/api/folders/${fid}`);
                loadSettingsFolders();
                loadSidebar();
            });
        });
    }

    // ── Update checker (GitHub releases) ─────────────────────────────────

    const RELEASES_PAGE = "https://github.com/DarkAdrick/Photonic/releases";
    const updatePill = document.getElementById("update-pill");
    let lastUpdateState = null;

    function lastCheckLabel(data) {
        if (!data || !data.checked_at) return "";
        const d = new Date(data.checked_at);
        const s = formatDateTime(d);
        return s ? `<span class="update-last-check">${t("update.last_check", { s })}</span>` : "";
    }

    function describeUpdateState(data) {
        if (!data) return t("update.not_checked");
        if (data.update_available) return t("update.new_available", { v: `v${data.latest_version}` }) + lastCheckLabel(data);
        if (data.error) return t("update.check_failed") + lastCheckLabel(data);
        if (data.checked_at) return t("update.up_to_date") + lastCheckLabel(data);
        return t("update.not_checked") + lastCheckLabel(data);
    }

    function applyUpdateState(data, notify) {
        lastUpdateState = data;
        if (data && data.update_available && data.latest_version) {
            updatePill.classList.remove("hidden");
            updatePill.href = data.release_url || RELEASES_PAGE;
            updatePill.title = t("update.new_available_title", { v: `v${data.latest_version}` });
            updatePill.querySelector("#update-pill-text").textContent = "v" + data.latest_version;
            lucide.createIcons();
            if (notify) {
                showToast(
                    t("update.view_release_toast", { v: `v${data.latest_version}`, url: data.release_url || RELEASES_PAGE }),
                    { icon: "arrow-up-circle", duration: 12000 }
                );
            }
        } else {
            updatePill.classList.add("hidden");
        }
        refreshUpdateSettingsCard();
    }

    function refreshUpdateSettingsCard() {
        const label = document.getElementById("setting-update-status");
        if (label) label.innerHTML = describeUpdateState(lastUpdateState);
    }

    async function initUpdateChecker() {
        // Poll until the backend has completed its startup GitHub check,
        // so the badge appears on first load without requiring a refresh.
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
            try {
                const data = await api("GET", "/api/update/status");
                if (data.checked_at) {
                    applyUpdateState(data, true);
                    return;
                }
            } catch { /* offline or older backend — stay silent */ }
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    // ── Changelog ───────────────────────────────────────────────────────

    const changelogDialog = document.getElementById("changelog-dialog");
    const changelogClose  = document.getElementById("changelog-close");
    const changelogBody   = document.getElementById("changelog-body");
    const versionBadge    = document.getElementById("version-badge");

    async function loadChangelog() {
        const data = await api("GET", "/api/changelog");
        if (data.html) changelogBody.innerHTML = data.html;
    }

    // ── Credits drawer (scrolling supporters & contributors) ──────────

    const clCreditsDrawer = document.getElementById("cl-credits");
    const clSponsorsSection = document.getElementById("cl-credits-section-sponsors");
    const clSponsorsTrack   = document.getElementById("cl-credits-sponsors");
    const clThanksSection   = document.getElementById("cl-credits-section-thanks");
    const clThanksTrack     = document.getElementById("cl-credits-thanks-track");
    const creditsAnims      = [];
    const CREDIT_SPEED  = 0.45; // px per frame at ~60fps

    // build a single credit row: name (optionally linked) + optional reason
    function buildCreditRow(entry) {
        const row = document.createElement("div");
        row.className = "cl-credits-thanks-item";
        const nameEl = document.createElement(entry && entry.url ? "a" : "span");
        nameEl.className = "cl-credits-name";
        nameEl.textContent = (entry && entry.name) || "";
        if (entry && entry.url) {
            nameEl.href = entry.url;
            nameEl.target = "_blank";
            nameEl.rel = "noopener";
            row.classList.add("cl-credits-item-link");
        }
        row.appendChild(nameEl);
        if (entry && entry.reason) {
            const reasonEl = document.createElement("span");
            reasonEl.className = "cl-credits-thanks-reason";
            reasonEl.textContent = entry.reason;
            row.appendChild(reasonEl);
        }
        return row;
    }

    function scrollCredits(track, rows) {
        track.innerHTML = "";
        if (!rows || rows.length === 0) { track.style.transform = "translateY(0px)"; return; }

        const viewport = track.parentElement;
        const viewportH = viewport.clientHeight || 200;
        const count = rows.length;

        // measure the packed block of names (natural gap from .cl-credits-track)
        track.append(...rows);
        const rowH = Math.max(16, rows[0].offsetHeight);
        const blockHeight = track.offsetHeight || (count * (rowH + 8));
        track.innerHTML = "";

        // one loop unit = packed block of names + a FULL blank screen afterwards.
        // When the last credit exits the top, a whole empty screen scrolls by,
        // and only then the first name re-enters from the bottom.
        rows.forEach(r => track.appendChild(r));
        const spacer = document.createElement("div");
        spacer.style.height = Math.floor(viewportH) + "px";
        spacer.style.flexShrink = "0";
        track.appendChild(spacer);
        const unitH = track.offsetHeight || Math.max(blockHeight + viewportH, viewportH);
        const oneUnit = track.innerHTML;

        const copies = Math.max(2, Math.ceil((viewportH + unitH) / unitH));
        for (let i = 1; i < copies; i++) track.innerHTML += oneUnit;

        stopCredits(track);
        // start with the first row at the bottom edge, rise one full unit,
        // then the (identical) next copy takes over seamlessly
        const startY = viewportH - rowH;
        const endY   = startY - unitH;
        const state = { track, y: startY, startY, endY, paused: false, handle: null };
        state.handle = setInterval(() => stepCredit(state), 16);
        creditsAnims.push(state);

        // pause while hovering so links can be clicked comfortably
        viewport.addEventListener("mouseenter", () => { if (!state.paused) { state.paused = true; clearInterval(state.handle); } });
        viewport.addEventListener("mouseleave", () => {
            if (state.paused) { state.paused = false; state.handle = setInterval(() => stepCredit(state), 16); }
        });
    }

    function stepCredit(a) {
        a.y -= CREDIT_SPEED;
        if (a.y <= a.endY) a.y = a.startY;
        a.track.style.transform = `translateY(${a.y}px)`;
    }

    function stopCredits(track) {
        for (let i = creditsAnims.length - 1; i >= 0; i--) {
            const a = creditsAnims[i];
            if (!track || a.track === track) {
                clearInterval(a.handle);
                creditsAnims.splice(i, 1);
            }
        }
        if (track) track.style.transform = "translateY(0px)";
    }

    function stopAllCredits() {
        while (creditsAnims.length) {
            const a = creditsAnims.pop();
            clearInterval(a.handle);
            a.track.style.transform = "translateY(0px)";
        }
    }

    function fillCredits({ names, thanks }) {
        stopAllCredits();

        // sponsors (GitHub + manual credits.json)
        const sponsorRows = (names || []).map(n => buildCreditRow(n));
        if (sponsorRows.length) clSponsorsSection.classList.remove("hidden");
        else clSponsorsSection.classList.add("hidden");
        scrollCredits(clSponsorsTrack, sponsorRows);

        // contributors (thanks from credits.json / manual)
        const thanksRows = (thanks || []).map(t => buildCreditRow(t));
        if (thanksRows.length) clThanksSection.classList.remove("hidden");
        else clThanksSection.classList.add("hidden");
        scrollCredits(clThanksTrack, thanksRows);

        // hide the whole drawer if nothing to show
        if (sponsorRows.length === 0 && thanksRows.length === 0) clCreditsDrawer.classList.add("hidden");
        else clCreditsDrawer.classList.remove("hidden");

        lucide.createIcons();
    }

    async function loadCredits(retries = 5) {
        const data = await api("GET", "/api/sponsors");
        const names  = data.sponsors || [];
        const thanks = data.thanks || [];
        // local credits.json returns immediately; keep a short poll so the
        // GitHub public-login merge can arrive and start the animation too
        if (names.length === 0 && thanks.length === 0 && retries > 0) {
            await new Promise(r => setTimeout(r, 500));
            return loadCredits(retries - 1);
        }
        return { names, thanks };
    }

    async function openChangelog() {
        await loadChangelog();
        changelogDialog.classList.remove("hidden");
        lucide.createIcons();
        try {
            const data = await loadCredits();
            fillCredits(data);
        } catch {
            clCreditsDrawer.classList.add("hidden");
        }
    }
    versionBadge.addEventListener("click", openChangelog);
    changelogClose.addEventListener("click", () => { stopAllCredits(); changelogDialog.classList.add("hidden"); });
    changelogDialog.addEventListener("click", (e) => { if (e.target === changelogDialog) { stopAllCredits(); changelogDialog.classList.add("hidden"); } });

    // ── Frameless desktop window (drag / resize / controls) ───────────────

    function initDesktopWindow() {
        if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.resize_window) return;
        document.body.classList.add("pywebview");
        const desktopApi = window.pywebview.api;

        // Resize handles: JS tracks the drag (WebView2 swallows native input
        // while a press starts inside the page) and feeds deltas to the API.
        function beginResize(e, edge) {
            const sx = e.screenX, sy = e.screenY;
            const sw = window.innerWidth, sh = window.innerHeight;
            let raf = 0;

            function onMove(ev) {
                if (raf) return;
                raf = requestAnimationFrame(() => {
                    raf = 0;
                    const dx = ev.screenX - sx, dy = ev.screenY - sy;
                    let w = sw, h = sh;
                    if (edge.indexOf("right") !== -1) w += dx;
                    else if (edge.indexOf("left") !== -1) w -= dx;
                    if (edge.indexOf("bottom") !== -1) h += dy;
                    else if (edge.indexOf("top") !== -1) h -= dy;
                    desktopApi.resize_window(
                        Math.max(Math.round(w), 800),
                        Math.max(Math.round(h), 600),
                        edge
                    );
                });
            }

            function onUp() {
                if (raf) { cancelAnimationFrame(raf); raf = 0; }
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
            }

            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
        }

        document.getElementById("win-resize").addEventListener("mousedown", (e) => {
            const edge = e.target.dataset && e.target.dataset.edge;
            if (!edge || document.body.classList.contains("maximized")) return;
            e.preventDefault();
            beginResize(e, edge);
        });

        // Window controls
        document.getElementById("wc-minimize").addEventListener("click", () => desktopApi.minimize());

        const maxBtn = document.getElementById("wc-maximize");
        function applyMaximized(m) {
            document.body.classList.toggle("maximized", !!m);
            maxBtn.title = m ? "Restore" : "Maximize";
            maxBtn.innerHTML = `<i data-lucide="${m ? "copy" : "square"}"></i>`;
            lucide.createIcons();
        }

        maxBtn.addEventListener("click", async () => {
            try { applyMaximized(await desktopApi.toggle_maximize()); } catch (_) {}
        });

        document.getElementById("titlebar-drag").addEventListener("dblclick", () => maxBtn.click());

        document.getElementById("wc-close").addEventListener("click", () => desktopApi.close_app());

        const controls = document.getElementById("window-controls");
        controls.classList.remove("hidden");
        lucide.createIcons();
    }

    if (window.pywebview && window.pywebview.api) {
        initDesktopWindow();
    } else {
        window.addEventListener("pywebviewready", initDesktopWindow);
    }

    // ── Internationalization (i18n) ───────────────────────────────────────

    function refreshLangHeader() {
        const cur = I18n.getCurrent();
        const flagEl = document.getElementById("lang-flag-current");
        if (flagEl) {
            const l = I18n.availableLanguages.find(x => x.code === cur);
            const src = l ? l.flag : "/i18n/flags/us.svg";
            flagEl.innerHTML = `<img src="${src}" alt="">`;
        }
        const menu = document.getElementById("lang-menu");
        if (menu) {
            menu.innerHTML = I18n.availableLanguages.map(l => {
                const cls = l.code === cur ? " lang-menu-item active" : " lang-menu-item";
                return `<button class="${cls.trim()}" data-lang="${l.code}"><span class="lang-menu-flag"><img src="${l.flag}" alt=""></span>${l.name}</button>`;
            }).join("");
        }
        const langSelect = document.getElementById("setting-language");
        if (langSelect) langSelect.value = cur;
    }

    function refreshAfterLangChange() {
        I18n.applyI18n();
        const settingsPageEl = document.getElementById("settings-page");
        const settingsOpen = settingsPageEl && !settingsPageEl.classList.contains("hidden");
        if (settingsOpen) {
            const active = document.querySelector(".settings-nav-item.active");
            const target = active ? active.dataset.section : "settings-application";
            if (target === "settings-application") renderApplicationSettings();
            else if (target === "settings-tags-p") loadSettingsTags();
            else if (target === "settings-collections-p") loadSettingsCollections();
            else if (target === "settings-folders-p") loadSettingsFolders();
            loadSidebar();
        } else {
            if (activeView === "locations") loadMapPhotos();
            else if (activeView === "countries" && !activeCountryCode) loadCountries();
            else if (activeView === "cameras" && !activeCameraBrowseId) loadCamerasBrowse();
            else if (activeView === "folders" && !activeFolderId) loadFolderBrowse();
            else if (activeView === "tags" && !activeTagBrowseId) loadTagsBrowse();
            else if (activeView === "collections") loadCollectionsBrowse();
            else loadPhotos();
            loadSidebar();
            loadFilters();
        }
        refreshLangHeader();
        lucide.createIcons();
    }

    function initLangDropdown() {
        const btn = document.getElementById("btn-lang");
        const menu = document.getElementById("lang-menu");
        refreshLangHeader();
        if (!btn || !menu) return;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.toggle("hidden");
        });
        document.addEventListener("click", () => menu.classList.add("hidden"));
        menu.addEventListener("click", (e) => {
            const item = e.target.closest(".lang-menu-item");
            if (!item) return;
            const code = item.dataset.lang;
            menu.classList.add("hidden");
            if (code !== I18n.getCurrent()) {
                I18n.setLanguage(code).then(() => refreshAfterLangChange());
            }
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────

    for (const name of THEME_VARS) {
        const v = localStorage.getItem(`photonic.${name}`);
        if (v) document.documentElement.style.setProperty(`--${name}`, v);
    }

    lucide.createIcons();
    I18n.ready().then(() => {
        I18n.applyI18n();
        refreshLangHeader();
        initLangDropdown();
        lucide.createIcons();
        checkStatus();
        loadSidebar();
        loadPhotos();
        loadFilters();
        pollScan();
        initUpdateChecker();
    });
})();
