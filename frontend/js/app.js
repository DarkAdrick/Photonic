(() => {
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
    const mapPhotos       = document.getElementById("map-photos");
    const btnAddFolder    = document.getElementById("btn-add-folder");
    const btnAddFolderSb  = document.getElementById("btn-add-folder-sidebar");
    const btnRescan       = document.getElementById("btn-rescan");
    const dialog          = document.getElementById("folder-dialog");
    const folderInput     = document.getElementById("folder-path");
    const btnOk           = document.getElementById("btn-dialog-ok");
    const btnCancel       = document.getElementById("btn-dialog-cancel");
    const sidebarFolders  = document.getElementById("sidebar-folders");
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
    const btnClearFilters = document.getElementById("btn-clear-filters");
    const navItems        = document.querySelectorAll("#sidebar nav li");

    const detailOverlay = document.getElementById("photo-detail");
    const detailImg     = document.getElementById("detail-img");
    const detailFname   = document.getElementById("detail-filename");
    const detailMeta    = document.getElementById("detail-meta");
    const detailMapSec  = document.getElementById("detail-map-section");
    const detailCoords  = document.getElementById("detail-coords");
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

    const mapResize    = document.getElementById("map-resize");
    const contextMenu  = document.getElementById("context-menu");

    const tagDialog      = document.getElementById("tag-dialog");
    const tagDialogTitle = document.getElementById("tag-dialog-title");
    const tagInput       = document.getElementById("tag-input");
    const tagColorPalette= document.getElementById("tag-color-palette");
    const tagColorPicker = document.getElementById("tag-color-picker");
    const tagExistingList= document.getElementById("tag-existing-list");
    const tagDialogOk    = document.getElementById("tag-dialog-ok");
    const tagDialogCancel= document.getElementById("tag-dialog-cancel");

    let tagModalPhotoId = null;
    let tagModalBatchIds = null;
    let tagModalSelectedColor = null;
    let tagModalExistingTags = [];

    const confirmDialog = document.getElementById("confirm-dialog");
    const confirmTitle  = document.getElementById("confirm-title");
    const confirmMsg    = document.getElementById("confirm-message");
    const confirmOk     = document.getElementById("confirm-ok");
    const confirmCancel = document.getElementById("confirm-cancel");
    let confirmResolve = null;

    function showConfirm(title, message, okText) {
        confirmTitle.textContent = title;
        confirmMsg.textContent = message;
        confirmOk.textContent = okText || "Delete";
        confirmDialog.classList.remove("hidden");
        return new Promise(resolve => { confirmResolve = resolve; });
    }
    confirmOk.addEventListener("click", () => { confirmDialog.classList.add("hidden"); if (confirmResolve) confirmResolve(true); });
    confirmCancel.addEventListener("click", () => { confirmDialog.classList.add("hidden"); if (confirmResolve) confirmResolve(false); });
    confirmDialog.addEventListener("click", (e) => { if (e.target === confirmDialog) { confirmDialog.classList.add("hidden"); if (confirmResolve) confirmResolve(false); } });

    const cleaningToolbar = document.getElementById("cleaning-toolbar");
    const cleaningTabs    = document.querySelectorAll(".cleaning-tab");
    const btnAnalyze      = document.getElementById("btn-analyze");
    const cleaningStatus  = document.getElementById("cleaning-status");
    const statsView       = document.getElementById("stats-view");

    let activeFolderId = null;
    let activeTagId = null;
    let activeTagBrowseId = null;
    let activeCameraBrowseId = null;
    let activeCountryCode = null;
    let activeView = "library";
    let cleaningTab = "duplicates";
    let selectedIds = new Set();
    let folderBrowsePath = [];

    const TAG_COLORS = [
        "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
        "#3498db", "#9b59b6", "#e84393", "#fd79a8", "#00cec9",
        "#6c5ce7", "#a29bfe", "#ffeaa7", "#fab1a0", "#74b9ff",
        "#55efc4", "#dfe6e9", "#636e72", "#b2bec3", "#2d3436",
    ];
    let scanPollCount = 0;
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
        photoGrid.querySelectorAll(".photo-card, .country-card").forEach(el => el.remove());
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
    let detailThumbVersion = 0;

    let lastSelectedId = null;
    let isDragging = false;
    let dragStartId = null;
    let dragMode = "select";
    let dragHighlightIds = new Set();
    let contextMenuPhotoId = null;

    async function api(method, path, body) {
        const opts = { method, headers: { "Content-Type": "application/json" } };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(path, opts);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) { console.error("API non-JSON:", res.status, path); return {}; }
        return res.json();
    }

    async function checkStatus() {
        try {
            const data = await api("GET", "/api/status");
            statusText.textContent = "Connected";
            photoCountH.textContent = data.photo_count > 0 ? `${data.photo_count.toLocaleString()} photos` : "";
        } catch {
            statusText.textContent = "Disconnected";
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
            emptyState.classList.add("hidden");
            photoGrid.classList.add("hidden");
            mapView.classList.remove("hidden");
            mapResize.classList.remove("hidden");
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
            photoGrid.classList.remove("hidden");
            activeFolderId = null;
            activeTagId = null;
            activeCountryCode = null;
            activeCameraBrowseId = null;
            loadCamerasBrowse();
        } else if (view === "folders") {
            breadcrumbBar.classList.add("hidden");
            statsView.classList.add("hidden");
            cleaningToolbar.classList.add("hidden");

            selectedIds.clear();
            emptyState.classList.add("hidden");
            mapView.classList.add("hidden");
            mapResize.classList.add("hidden");
            mapPhotos.classList.add("hidden");
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
        map = L.map("map-view").setView([46.6, 2.3], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
            maxZoom: 20,
        }).addTo(map);
        clusterGroup = L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false, disableClusteringAtZoom: 18 });
        plainGroup = L.layerGroup();
        map.addLayer(clusterGroup);
        map.on("moveend", () => {
            clearTimeout(mapMoveTimeout);
            mapMoveTimeout = setTimeout(loadMapPhotos, 300);
        });
        setTimeout(() => map.invalidateSize(), 100);
    }

    async function loadMapPhotos() {
        if (!map) return;
        const b = map.getBounds();
        let url = `/api/photos/geo?south=${b.getSouth()}&west=${b.getWest()}&north=${b.getNorth()}&east=${b.getEast()}`;
        if (activeFolderId) url += `&folder_id=${activeFolderId}`;
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
        const data = await api("GET", url);

        clusterGroup.clearLayers();
        plainGroup.clearLayers();
        if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup);
        if (map.hasLayer(plainGroup)) map.removeLayer(plainGroup);
        const useCluster = data.total >= 500;
        const target = useCluster ? clusterGroup : plainGroup;
        map.addLayer(target);

        mapPhotos.innerHTML = "";
        for (const p of data.photos) {
            const marker = L.marker([p.lat, p.lng]);
            marker.on("click", () => openDetail(p.id));
            target.addLayer(marker);

            const card = document.createElement("div");
            card.className = "photo-card";
            card.dataset.photoId = p.id;
            card.innerHTML = `<img src="${p.thumb}" alt="${p.filename}" loading="lazy">`;
            card.addEventListener("click", () => {
                openDetail(p.id);
            });
            mapPhotos.appendChild(card);
        }
        photoCountH.textContent = `${data.total.toLocaleString()} geo-tagged`;
    }

    // ── Sidebar (Folders + Tags always visible) ────────────────────────────

    async function loadSidebar() {
        const [rawFolders, rawTags] = await Promise.all([
            api("GET", "/api/folders/tree"),
            api("GET", "/api/tags"),
        ]);
        const folders = Array.isArray(rawFolders) ? rawFolders : [];
        const tags = Array.isArray(rawTags) ? rawTags : [];
        btnRescan.disabled = folders.length === 0;

        let html = "";
        if (folders.length > 0) {
            const fCollapsed = localStorage.getItem("sb-folders") === "1";
            html += '<h4 class="sb-section-header' + (fCollapsed ? " collapsed" : "") + '" data-section="sb-folders"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></svg> Folders</h4>';
            html += '<div class="sb-section-content' + (fCollapsed ? " collapsed" : "") + '">';
            html += '<div class="folder-item' + (activeFolderId === null ? " active" : "") + '" data-folder-id="all">All Photos</div>';
            for (const f of folders) {
                const active = activeFolderId === f.id ? " active" : "";
                const indent = f.depth > 0 ? ` style="padding-left:${24 + f.depth * 16}px"` : "";
                html += `<div class="folder-item${active}" data-folder-id="${f.id}" title="${f.path}"${indent}>${f.name}</div>`;
            }
            html += '</div>';
        }

        if (tags.length > 0) {
            const tCollapsed = localStorage.getItem("sb-tags") === "1";
            html += '<h4 class="sb-section-header' + (tCollapsed ? " collapsed" : "") + '" data-section="sb-tags"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle></svg> Tags</h4>';
            html += '<div class="sb-section-content' + (tCollapsed ? " collapsed" : "") + '">';
            for (const t of tags) {
                const active = activeTagId === t.id ? " active" : "";
                const color = t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
                html += `<div class="tag-item${active}" data-tag-id="${t.id}"><span class="tag-dot" style="background:${color}"></span>${t.name} <span class="tag-count">${t.photo_count}</span></div>`;
            }
            html += '</div>';
        }

        sidebarFolders.innerHTML = html;

        sidebarFolders.querySelectorAll(".sb-section-header").forEach(h => {
            h.addEventListener("click", () => {
                const key = h.dataset.section;
                const content = h.nextElementSibling;
                const collapsed = h.classList.toggle("collapsed");
                content.classList.toggle("collapsed", collapsed);
                localStorage.setItem(key, collapsed ? "1" : "0");
            });
        });

        sidebarFolders.querySelectorAll(".folder-item").forEach(el => {
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

        sidebarFolders.querySelectorAll(".tag-item").forEach(el => {
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
        let html = '<span class="bc-item bc-link" data-bc="folders-root">Folders</span>';
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
            photoCountH.textContent += (totalFolders > 0 ? " + " : "") + `${count.toLocaleString()} direct photo${count > 1 ? "s" : ""}`;
            for (const p of photos) {
                const card = document.createElement("div");
                card.className = "photo-card";
                card.innerHTML = `
                    <img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">
                    <div class="photo-label">${p.filename}</div>
                `;
                card.addEventListener("click", () => openDetail(p.id));
                photoGrid.appendChild(card);
            }
        }
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
            breadcrumbBar.innerHTML = '<span class="bc-item bc-current">Tags</span>';
        } else {
            const t = tagsData.find(x => x.id === activeTagBrowseId);
            const color = t ? (t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length]) : "#888";
            const name = t ? t.name : activeTagBrowseId;
            breadcrumbBar.innerHTML =
                '<span class="bc-item bc-link" data-bc="tags">Tags</span>' +
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
            photoCountH.textContent = `${tagsData.length} tags`;
            for (const t of tagsData) {
                const card = document.createElement("div");
                card.className = "country-card";
                const color = t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
                const thumbs = t.sample_ids.map(id =>
                    `<img src="/api/photos/${id}/thumb/medium" alt="" loading="lazy">`
                ).join("");
                card.innerHTML =
                    `<div class="country-card-grid">${thumbs}</div>` +
                    `<div class="country-card-info">` +
                    `<span class="tag-dot" style="background:${color}"></span> ` +
                    `<span class="country-card-name">${t.name}</span>` +
                    `<span class="country-card-count">${t.photo_count.toLocaleString()}</span>` +
                    `</div>`;
                card.addEventListener("click", () => {
                    activeTagBrowseId = t.id;
                    loadTagsBrowse();
                });
                photoGrid.appendChild(card);
            }
        } else {
            const t = tagsData.find(x => x.id === activeTagBrowseId);
            if (t) {
                const color = t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
                photoCountH.innerHTML = `<span class="tag-dot" style="background:${color}"></span> ${t.name} — ${t.photo_count.toLocaleString()} photos`;
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
            breadcrumbBar.innerHTML = '<span class="bc-item bc-current">Cameras</span>';
        } else {
            breadcrumbBar.innerHTML =
                '<span class="bc-item bc-link" data-bc="cameras">Cameras</span>' +
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
            breadcrumbBar.innerHTML = '<span class="bc-item bc-current">Countries</span>';
        } else {
            const c = countriesData.find(x => x.code === activeCountryCode);
            const name = c ? `${countryFlag(c.code)} ${c.name}` : activeCountryCode;
            breadcrumbBar.innerHTML =
                '<span class="bc-item bc-link" data-bc="countries">Countries</span>' +
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
            if (c) photoCountH.innerHTML = `${countryFlag(c.code)} ${c.name} — ${c.photo_count.toLocaleString()} photos`;
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
                photoCountH.textContent = "No duplicates found";
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = `${data.count} duplicate photos in ${data.groups.length} groups`;
            for (const group of data.groups) {
                const sep = document.createElement("div");
                sep.className = "cleaning-separator";
                sep.innerHTML = `<span>${group.length} identical files — ${(group[0].size / 1048576).toFixed(1)} MB each</span>`;
                photoGrid.appendChild(sep);
                renderCleaningCards(group, true);
            }
        } else if (cleaningTab === "blurry") {
            const data = await api("GET", "/api/cleaning/blurry");
            if (data.count === 0) {
                photoCountH.textContent = "No blurry photos found";
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = `${data.count} blurry photos`;
            renderCleaningCards(data.photos, true);
        } else if (cleaningTab === "similar") {
            const data = await api("GET", "/api/cleaning/similar");
            if (data.count === 0) {
                photoCountH.textContent = "No similar photos found";
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = `${data.count} similar photos in ${data.groups.length} groups`;
            for (const group of data.groups) {
                const sep = document.createElement("div");
                sep.className = "cleaning-separator";
                sep.innerHTML = `<span>${group.length} similar photos</span>`;
                photoGrid.appendChild(sep);
                renderCleaningCards(group, true);
            }
        } else if (cleaningTab === "bad") {
            const data = await api("GET", "/api/cleaning/bad");
            if (data.count === 0) {
                photoCountH.textContent = "No bad quality photos found";
                emptyState.classList.remove("hidden");
                photoGrid.classList.add("hidden");
                return;
            }
            photoCountH.textContent = `${data.count} bad quality photos`;
            renderCleaningCards(data.photos, true);
        }
    }

    let analyzePollTimer = null;
    async function startAnalysis() {
        btnAnalyze.disabled = true;
        cleaningStatus.classList.remove("hidden");
        cleaningStatus.textContent = "Starting analysis...";
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
            `Delete ${n} photo${n > 1 ? "s" : ""}?`,
            `This action cannot be undone. The ${n > 1 ? `${n} files will` : "file will"} be permanently removed.`,
            "Delete"
        );
        if (!ok) return;
        for (const id of ids) selectedIds.add(id);
        await api("POST", "/api/cleaning/delete", { ids });
        selectedIds.clear();
        renderSelection();
        onFilterChange();
    }

    async function removeTagsFromTargets(ids) {
        const ok = await showConfirm(
            `Remove all tags from ${ids.length} photo${ids.length > 1 ? "s" : ""}?`,
            "All tags on the selected photos will be removed.",
            "Remove"
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
                    <div class="stat-label">Photos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatSizeShort(d.total_size)}</div>
                    <div class="stat-label">Total Size</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.geo_count.toLocaleString()} / ${d.geo_total.toLocaleString()}</div>
                    <div class="stat-label">Geolocalized (${geoPct}%)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.formats.length}</div>
                    <div class="stat-label">Formats</div>
                </div>
            </div>
            <div class="stats-charts">
                <div class="stats-chart-box">
                    <h4>Formats</h4>
                    <canvas id="chart-format"></canvas>
                </div>
                <div class="stats-chart-box">
                    <h4>Top Countries</h4>
                    <canvas id="chart-countries"></canvas>
                </div>
                <div class="stats-chart-box stats-chart-wide">
                    <h4>Photos over time</h4>
                    <canvas id="chart-timeline"></canvas>
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
                                    return ` ${f.count.toLocaleString()} files (${formatSizeShort(f.size)})`;
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
                            label: "Monthly",
                            data: counts,
                            borderColor: "#5b9fd6",
                            backgroundColor: "rgba(91,159,214,0.15)",
                            fill: true,
                            tension: 0.3,
                            pointRadius: 1,
                            borderWidth: 2,
                        },
                        {
                            label: "Cumulative",
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

        photoCountH.textContent = "Statistics";
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
        populateSelect(filterCamera, data.cameras, "All");
        populateSelect(filterLens, data.lenses, "All");
        populateSelect(filterExt, data.extensions, "All", e => `.${e}`);
        populateSelect(filterCountry, data.countries, "All countries");
        populateSelect(filterCity, data.cities, "All cities");
    }

    function getFilterParams() {
        const p = new URLSearchParams();
        if (activeFolderId) p.set("folder_id", activeFolderId);
        const q = searchInput.value.trim();
        if (q) p.set("q", q);
        if (activeCameraBrowseId) {
            p.set("camera", activeCameraBrowseId);
        } else if (filterCamera.value) {
            p.set("camera", filterCamera.value);
        }
        if (filterLens.value) p.set("lens", filterLens.value);
        if (filterExt.value) p.set("ext", filterExt.value);
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
            photoCountH.textContent = `${data.total.toLocaleString()} photos`;

            for (const p of data.photos) {
                const card = document.createElement("div");
                card.className = "photo-card";
                card.dataset.photoId = p.id;
                card.innerHTML = `
                    <img src="${p.thumb}" alt="${p.filename}" loading="lazy">
                    <div class="photo-label">${p.filename}</div>
                `;
                card.addEventListener("click", () => openDetail(p.id));
                photoGrid.appendChild(card);
            }
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
        return Array.from(photoGrid.querySelectorAll(".photo-card[data-photo-id]"));
    }

    function getPhotoCardIds() {
        return getVisiblePhotoCards().map(c => parseInt(c.dataset.photoId));
    }

    function renderSelection() {
        photoGrid.classList.toggle("has-selection", selectedIds.size > 0);
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

    photoGrid.addEventListener("mousedown", (e) => {
        if (e.button === 2) return;
        if (e.target.closest(".cleaning-check")) return;
        const id = getPhotoIdFromEvent(e);
        if (id == null) return;
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
    });

    photoGrid.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const id = getPhotoIdFromEvent(e);
        if (id == null) return;
        dragHighlightIds = new Set(getDragRangeIds(dragStartId, id));
        updateDragHighlights();
    });

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

    photoGrid.addEventListener("click", (e) => {
        if (e.target.closest(".cleaning-check")) return;
        const id = getPhotoIdFromEvent(e);
        if (id == null) return;
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
            e.preventDefault();
            return;
        }
        openDetail(id);
    }, true);

    // ── Context Menu ──────────────────────────────────────────────────────

    let contextMenuTargets = [];

    photoGrid.addEventListener("contextmenu", (e) => {
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
    });

    function showContextMenu(x, y) {
        const count = contextMenuTargets.length;
        const header = document.getElementById("context-header");
        header.textContent = count === 1 ? "1 photo" : `${count} photos`;

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
        if (!photoGrid.contains(e.target)) hideContextMenu();
    });

    // ── Selection Bar ────────────────────────────────────────────────────

    const selectionCount = document.getElementById("selection-count");
    const btnDeselectAll = document.getElementById("btn-deselect-all");

    btnDeselectAll.addEventListener("click", deselectAll);

    function updateSelectionBar() {
        const n = selectedIds.size;
        selectionCount.textContent = n > 0 ? `${n} selected` : "";
        selectionCount.classList.toggle("hidden", n === 0);
        btnDeselectAll.classList.toggle("hidden", n === 0);
    }

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
        await loadDetail(photoId);
        detailOverlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeDetail() {
        detailOverlay.classList.add("hidden");
        document.body.style.overflow = "";
        detailCurrentPhotoId = null;
        resetDetailZoom();
        if (detailMap) { detailMap.remove(); detailMap = null; }
    }

    async function navigateDetail(delta) {
        const newIdx = detailIndex + delta;
        if (newIdx < 0 || newIdx >= currentPhotoIds.length) return;
        detailIndex = newIdx;
        resetDetailZoom();
        await loadDetail(currentPhotoIds[newIdx]);
    }

    async function loadDetail(photoId) {
        detailCurrentPhotoId = photoId;
        const data = await api("GET", `/api/photos/${photoId}`);
        if (data.error) return;

        detailImg.src = `/api/photos/${photoId}/thumb/large?t=${detailThumbVersion}`;
        detailFname.textContent = data.filename;
        detailCounter.textContent = `${detailIndex + 1} / ${currentPhotoIds.length}`;
        applyDetailZoom();
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
            ["Date Taken", data.date_taken],
            ["Created", data.created_date],
            ["Modified", data.modified_date],
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

        const tagData = await api("GET", `/api/photos/${photoId}/tags`);

        detailTags.innerHTML = "";
        for (const t of tagData) {
            const color = t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
            const pill = document.createElement("span");
            pill.className = "tag-pill";
            pill.textContent = t.name;
            pill.style.setProperty("--tag-color", color);
            pill.title = "Click to remove";
            pill.addEventListener("click", async () => {
                await api("DELETE", `/api/photos/${photoId}/tags/${t.id}`);
                await loadDetail(photoId);
            });
            detailTags.appendChild(pill);
        }

        const addBtn = document.createElement("span");
        addBtn.className = "tag-pill tag-add";
        addBtn.textContent = "+ Add tag";
        addBtn.addEventListener("click", () => openTagModal(photoId));
        detailTags.appendChild(addBtn);

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

    // ── Tag Modal ──────────────────────────────────────────────────────────

    async function openTagModal(photoId) {
        tagModalPhotoId = photoId;
        tagModalBatchIds = null;
        tagModalExistingTags = await api("GET", "/api/tags");
        tagDialogTitle.textContent = "Add Tag";
        tagInput.value = "";
        tagModalSelectedColor = TAG_COLORS[6];
        tagColorPicker.value = tagModalSelectedColor;

        tagColorPalette.innerHTML = "";
        for (const c of TAG_COLORS) {
            const swatch = document.createElement("div");
            swatch.className = "tag-color-swatch" + (c === tagModalSelectedColor ? " active" : "");
            swatch.style.background = c;
            swatch.addEventListener("click", () => {
                tagModalSelectedColor = c;
                tagColorPicker.value = c;
                tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
                swatch.classList.add("active");
            });
            tagColorPalette.appendChild(swatch);
        }
        tagColorPalette.appendChild(tagColorPicker);

        tagColorPicker.addEventListener("input", (e) => {
            tagModalSelectedColor = e.target.value;
            tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
        });

        renderTagExistingList();
        tagDialog.classList.remove("hidden");
        tagInput.focus();
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
        tagDialogTitle.textContent = `Add Tag to ${photoIds.length} photos`;
        tagInput.value = "";
        tagModalSelectedColor = TAG_COLORS[6];
        tagColorPicker.value = tagModalSelectedColor;

        tagColorPalette.innerHTML = "";
        for (const c of TAG_COLORS) {
            const swatch = document.createElement("div");
            swatch.className = "tag-color-swatch" + (c === tagModalSelectedColor ? " active" : "");
            swatch.style.background = c;
            swatch.addEventListener("click", () => {
                tagModalSelectedColor = c;
                tagColorPicker.value = c;
                tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
                swatch.classList.add("active");
            });
            tagColorPalette.appendChild(swatch);
        }
        tagColorPalette.appendChild(tagColorPicker);

        tagColorPicker.addEventListener("input", (e) => {
            tagModalSelectedColor = e.target.value;
            tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
        });

        renderTagExistingList();
        tagDialog.classList.remove("hidden");
        tagInput.focus();
    }

    function closeTagModal() {
        tagDialog.classList.add("hidden");
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
        scanStatus.textContent = "Starting scan...";
        await api("POST", "/api/scan", { path });
        scanPollCount = 0;
        pollScan();
    }

    async function rescanAll() {
        btnRescan.disabled = true;
        scanStatus.textContent = "Starting scan...";
        await api("POST", "/api/scan", { path: "all" });
        scanPollCount = 0;
        pollScan();
    }

    // ── Scan polling ──────────────────────────────────────────────────────

    async function pollScan() {
        const data = await api("GET", "/api/scan/status");
        if (data.running && data.total > 0) {
            const pct = Math.round((data.done / data.total) * 100);
            scanProgress.classList.remove("hidden");
            scanFill.style.width = pct + "%";
            scanStatus.textContent = `${data.done.toLocaleString()} / ${data.total.toLocaleString()} (${pct}%)`;
            btnRescan.disabled = true;
            scanPollCount++;
            if (scanPollCount % 2 === 0) {
                await loadFilters();
                await checkStatus();
            }
            setTimeout(pollScan, 500);
        } else if (data.running) {
            scanProgress.classList.remove("hidden");
            scanFill.style.width = "0%";
            scanStatus.textContent = "Preparing...";
            btnRescan.disabled = true;
            setTimeout(pollScan, 500);
        } else {
            scanPollCount = 0;
            scanProgress.classList.add("hidden");
            scanFill.style.width = "0%";
            scanStatus.textContent = "";
            btnRescan.disabled = false;
            onFilterChange();
            await loadSidebar();
            await loadFilters();
            await checkStatus();
        }
    }

    // ── Event listeners ───────────────────────────────────────────────────

    navItems.forEach(li => {
        li.addEventListener("click", () => setView(li.dataset.view));
    });
    btnToggleFilters.addEventListener("click", () => {
        filterDrawer.classList.toggle("hidden");
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
    btnClearFilters.addEventListener("click", clearFilters);
    btnAddFolder.addEventListener("click", openDialog);
    btnAddFolderSb.addEventListener("click", openDialog);
    btnRescan.addEventListener("click", rescanAll);
    btnOk.addEventListener("click", addFolder);
    btnCancel.addEventListener("click", closeDialog);
    folderInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addFolder(); });

    tagDialogOk.addEventListener("click", submitTagModal);
    tagDialogCancel.addEventListener("click", closeTagModal);
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
    document.getElementById("detail-open").addEventListener("click", () => {
        if (detailCurrentPhotoId) api("POST", `/api/photos/${detailCurrentPhotoId}/open`);
    });
    document.getElementById("detail-reveal").addEventListener("click", () => {
        if (detailCurrentPhotoId) api("POST", `/api/photos/${detailCurrentPhotoId}/reveal`);
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
            if (usesGrid && !photoGrid.classList.contains("hidden")) {
                e.preventDefault();
                photoGrid.querySelectorAll(".photo-card[data-photo-id]").forEach(c => selectedIds.add(parseInt(c.dataset.photoId)));
                renderSelection();
            }
        }
    });

    // ── Thumb size slider + Ctrl+Scroll ────────────────────────────────────

    const thumbSlider  = document.getElementById("thumb-size");
    const thumbMin = 60;
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
        thumbSlider.value = px;
        localStorage.setItem("thumb-size", px);
        if (hasMore && !loadingMore) {
            requestAnimationFrame(() => {
                if (photoGrid.scrollTop + photoGrid.clientHeight >= photoGrid.scrollHeight - 10) loadPhotos(false);
            });
        }
    }

    thumbSlider.addEventListener("input", () => setThumbSize(+thumbSlider.value));

    photoGrid.addEventListener("wheel", (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
        setThumbSize(cur + (e.deltaY < 0 ? 20 : -20));
    }, { passive: false });

    const saved = localStorage.getItem("thumb-size");
    setThumbSize(saved ? +saved : thumbDefault);

    // ── Settings Dialog ───────────────────────────────────────────────────

    const settingsDialog    = document.getElementById("settings-dialog");
    const settingsTagsList  = document.getElementById("settings-tags-list");
    const settingsFoldersList = document.getElementById("settings-folders-list");
    const btnSettings       = document.getElementById("btn-settings");
    const settingsClose     = document.getElementById("settings-close");

    function openSettings() {
        settingsDialog.classList.remove("hidden");
        settingsDialog.querySelectorAll(".settings-tab").forEach(t => t.classList.remove("active"));
        settingsDialog.querySelector('.settings-tab[data-tab="settings-tags"]').classList.add("active");
        document.getElementById("settings-tags").classList.remove("hidden");
        document.getElementById("settings-folders").classList.add("hidden");
        loadSettingsTags();
        lucide.createIcons();
    }

    btnSettings.addEventListener("click", openSettings);
    settingsClose.addEventListener("click", () => settingsDialog.classList.add("hidden"));
    settingsDialog.addEventListener("click", (e) => { if (e.target === settingsDialog) settingsDialog.classList.add("hidden"); });

    settingsDialog.querySelectorAll(".settings-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            settingsDialog.querySelectorAll(".settings-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const target = tab.dataset.tab;
            document.getElementById("settings-tags").classList.toggle("hidden", target !== "settings-tags");
            document.getElementById("settings-folders").classList.toggle("hidden", target !== "settings-folders");
            if (target === "settings-tags") loadSettingsTags();
            else loadSettingsFolders();
        });
    });

    function settingsTagColor(t) {
        return t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
    }

    async function loadSettingsTags() {
        const tags = await api("GET", "/api/tags");
        if (!tags.length) { settingsTagsList.innerHTML = '<div class="settings-empty">No tags yet</div>'; return; }
        settingsTagsList.innerHTML = "";
        for (const t of tags) {
            const color = settingsTagColor(t);
            const row = document.createElement("div");
            row.className = "settings-row";
            row.innerHTML = `
                <span class="tag-dot" style="background:${color}"></span>
                <input type="color" value="${color}" data-tag-id="${t.id}">
                <input type="text" value="${t.name}" data-tag-id="${t.id}">
                <button class="settings-row-delete" title="Delete tag" data-tag-id="${t.id}"><i data-lucide="trash-2"></i></button>
            `;
            settingsTagsList.appendChild(row);
        }
        lucide.createIcons();

        settingsTagsList.querySelectorAll('input[type="color"]').forEach(inp => {
            inp.addEventListener("input", async () => {
                const tid = parseInt(inp.dataset.tagId);
                await api("PUT", `/api/tags/${tid}`, { color: inp.value });
                inp.closest(".settings-row").querySelector(".tag-dot").style.background = inp.value;
                loadSidebar();
            });
        });

        settingsTagsList.querySelectorAll('input[type="text"]').forEach(inp => {
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

        settingsTagsList.querySelectorAll(".settings-row-delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const tid = parseInt(btn.dataset.tagId);
                const name = btn.closest(".settings-row").querySelector('input[type="text"]').value;
                if (!await showConfirm("Delete Tag", `Delete tag "${name}"? Photos will keep their other tags.`, "Delete")) return;
                await api("DELETE", `/api/tags/${tid}`);
                loadSettingsTags();
                loadSidebar();
            });
        });
    }

    async function loadSettingsFolders() {
        const folders = await api("GET", "/api/folders");
        if (!folders.length) { settingsFoldersList.innerHTML = '<div class="settings-empty">No folders added</div>'; return; }
        settingsFoldersList.innerHTML = "";
        for (const f of folders) {
            const row = document.createElement("div");
            row.className = "settings-row";
            row.innerHTML = `
                <i data-lucide="folder" style="width:14px;height:14px;color:var(--accent);flex-shrink:0"></i>
                <span class="settings-folder-path" title="${f.path}">${f.path}</span>
                <button class="settings-row-delete" title="Remove folder" data-folder-id="${f.id}"><i data-lucide="trash-2"></i></button>
            `;
            settingsFoldersList.appendChild(row);
        }
        lucide.createIcons();

        settingsFoldersList.querySelectorAll(".settings-row-delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const fid = parseInt(btn.dataset.folderId);
                const path = btn.closest(".settings-row").querySelector(".settings-folder-path").textContent;
                if (!await showConfirm("Remove Folder", `Remove folder "${path}"? Photos in this folder will remain in the library.`, "Remove")) return;
                await api("DELETE", `/api/folders/${fid}`);
                loadSettingsFolders();
                loadSidebar();
            });
        });
    }

    // ── Changelog ───────────────────────────────────────────────────────

    const changelogDialog = document.getElementById("changelog-dialog");
    const changelogClose  = document.getElementById("changelog-close");
    const versionBadge    = document.getElementById("version-badge");

    versionBadge.addEventListener("click", () => {
        changelogDialog.classList.remove("hidden");
        lucide.createIcons();
    });
    changelogClose.addEventListener("click", () => changelogDialog.classList.add("hidden"));
    changelogDialog.addEventListener("click", (e) => { if (e.target === changelogDialog) changelogDialog.classList.add("hidden"); });

    // ── Init ──────────────────────────────────────────────────────────────

    lucide.createIcons();
    checkStatus();
    loadSidebar();
    loadPhotos();
    loadFilters();
    pollScan();
})();
