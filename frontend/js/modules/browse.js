// Photonic module: browse
(function (P) {
    const t = P.t;
        // ── Folder Browse (main area) ─────────────────────────────────────────
    
        function renderFolderBreadcrumb() {
            if (P.activeView !== "folders") {
                P.breadcrumbBar.classList.add("hidden");
                return;
            }
            P.breadcrumbBar.classList.remove("hidden");
            let html = `<span class="bc-item bc-link" data-bc="folders-root">${t("sidebar.folders")}</span>`;
            for (let i = 0; i < P.folderBrowsePath.length; i++) {
                html += '<span class="bc-sep">›</span>';
                if (i < P.folderBrowsePath.length - 1) {
                    html += `<span class="bc-item bc-link" data-bc="folders-${i}">${P.folderBrowsePath[i].name}</span>`;
                } else {
                    html += `<span class="bc-item bc-current">${P.folderBrowsePath[i].name}</span>`;
                }
            }
            P.breadcrumbBar.innerHTML = html;
            P.breadcrumbBar.querySelectorAll(".bc-link").forEach(el => {
                el.addEventListener("click", () => {
                    const idx = el.dataset.bc;
                    if (idx === "folders-root") {
                        P.folderBrowsePath = [];
                    } else {
                        P.folderBrowsePath = P.folderBrowsePath.slice(0, parseInt(idx.split("-")[1]) + 1);
                    }
                    loadFolderBrowse();
                });
            });
        }
    
        async function loadFolderBrowse() {
            const fpath = P.folderBrowsePath.length > 0 ? P.folderBrowsePath[P.folderBrowsePath.length - 1].path : null;
            const hq = P.fn.hiddenQuery();
            const url = fpath
                ? `/api/folders/browse?folder_path=${encodeURIComponent(fpath)}${hq ? "&" + hq : ""}`
                : `/api/folders/browse${hq ? "?" + hq : ""}`;
            const data = await P.fn.api("GET", url);
            renderFolderBreadcrumb();
    
            const folders = data.folders || [];
            const photos = data.photos || [];
    
            if (P.folderBrowsePath.length === 0 && folders.length === 0) {
                P.emptyState.classList.remove("hidden");
                P.photoGrid.classList.add("hidden");
                P.photoCountH.textContent = "";
                return;
            }
            P.emptyState.classList.add("hidden");
            P.photoGrid.classList.remove("hidden");
            P.fn.clearGrid();
            const totalFolders = folders.length;
            P.photoCountH.textContent = totalFolders > 0 ? `${totalFolders} folder${totalFolders > 1 ? "s" : ""}` : "";
    
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
                    P.folderBrowsePath.push({ path: f.path, name: f.name });
                    loadFolderBrowse();
                });
                P.photoGrid.appendChild(card);
            }
    
            if (photos.length > 0) {
                const count = photos.length;
                P.photoCountH.textContent += (totalFolders > 0 ? " + " : "") + t("common.direct_items", { count: count.toLocaleString() });
                for (const p of photos) {
                    const card = document.createElement("div");
                    card.className = "photo-card" + (P.fn.isPhotoHidden(p) ? " photo-card-hidden" : "");
                    card.title = p.filename;
                    let badge = "";
                    if (P.fn.is360Photo(p)) {
                        badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
                    } else if (P.fn.isVideo(p)) {
                        badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
                    }
                    card.innerHTML = `
                        <img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">
                        ${badge}
                        ${P.fn.renderHiddenBadge(p)}
                        ${P.fn.renderMetaBadges(p)}
                        <div class="photo-label">${p.filename}</div>
                    `;
                    card.addEventListener("click", () => P.fn.openDetail(p.id));
                    P.photoGrid.appendChild(card);
                }
                lucide.createIcons();
                P.fn.renderSelection();
            }
        }
    
        // ── Collections Browse (main area) ────────────────────────────────────
    
        function renderCollectionBreadcrumb() {
            if (P.activeView !== "collections") {
                P.breadcrumbBar.classList.add("hidden");
                return;
            }
            P.breadcrumbBar.classList.remove("hidden");
            let html = `<span class="bc-item bc-link" data-bc="collections-root"><i data-lucide="library" style="width: 14px; height: 14px; margin-right: 4px;"></i>${t("sidebar.collections")}</span>`;
            for (let i = 0; i < P.collectionBrowsePath.length; i++) {
                html += '<span class="bc-sep">›</span>';
                const icon = P.collectionBrowsePath[i].icon ? `<i data-lucide="${P.collectionBrowsePath[i].icon}" style="width: 14px; height: 14px; margin-right: 4px;"></i>` : "";
                if (i < P.collectionBrowsePath.length - 1) {
                    html += `<span class="bc-item bc-link" data-bc="collections-${i}">${icon}${P.collectionBrowsePath[i].name}</span>`;
                } else {
                    html += `<span class="bc-item bc-current">${icon}${P.collectionBrowsePath[i].name}</span>`;
                }
            }
            P.breadcrumbBar.innerHTML = html;
            lucide.createIcons({ root: P.breadcrumbBar });
            P.breadcrumbBar.querySelectorAll(".bc-link").forEach(el => {
                el.addEventListener("click", () => {
                    const idx = el.dataset.bc;
                    if (idx === "collections-root") {
                        P.collectionBrowsePath = [];
                    } else {
                        P.collectionBrowsePath = P.collectionBrowsePath.slice(0, parseInt(idx.split("-")[1]) + 1);
                    }
                    loadCollectionsBrowse();
                });
            });
        }
    
        async function loadCollectionsBrowse() {
            const cid = P.collectionBrowsePath.length > 0 ? P.collectionBrowsePath[P.collectionBrowsePath.length - 1].id : null;
            const hq = P.fn.hiddenQuery();
            const hid = hq ? "&" + hq : "";
            const url = cid
                ? `/api/collections/browse?parent_id=${cid}${hid}`
                : `/api/collections/browse${hq ? "?" + hq : ""}`;
            const collections = await P.fn.api("GET", url);
            
            let photos = [];
            if (cid) {
                const photosData = await P.fn.api("GET", `/api/photos?collection_id=${cid}&per_page=500${hid}`);
                photos = photosData.photos || [];
            }
    
            renderCollectionBreadcrumb();
    
            if (P.collectionBrowsePath.length === 0 && collections.length === 0) {
                P.emptyState.classList.remove("hidden");
                P.photoGrid.classList.add("hidden");
                P.photoCountH.textContent = t("collections.none_found");
                return;
            }
            P.emptyState.classList.add("hidden");
            P.photoGrid.classList.remove("hidden");
            P.fn.clearGrid();
            
            const totalCollections = collections.length;
            P.photoCountH.textContent = totalCollections > 0 ? t("common.collections_count", { count: totalCollections }) : "";
    
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
                    P.collectionBrowsePath.push({ id: c.id, name: c.name, icon: c.icon });
                    loadCollectionsBrowse();
                });
                P.photoGrid.appendChild(card);
            }
    
            if (photos.length > 0) {
                const count = photos.length;
                P.photoCountH.textContent += (totalCollections > 0 ? " + " : "") + t("common.direct_items", { count: count.toLocaleString() });
                for (const p of photos) {
                    const card = document.createElement("div");
                    card.className = "photo-card" + (P.fn.isPhotoHidden(p) ? " photo-card-hidden" : "");
                    card.title = p.filename;
                    let badge = "";
                    if (P.fn.is360Photo(p)) {
                        badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
                    } else if (P.fn.isVideo(p)) {
                        badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
                    }
                    card.innerHTML = `
                        <img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">
                        ${badge}
                        ${P.fn.renderHiddenBadge(p)}
                        ${P.fn.renderMetaBadges(p)}
                        <div class="photo-label">${p.filename}</div>
                    `;
                    card.addEventListener("click", () => P.fn.openDetail(p.id));
                    P.photoGrid.appendChild(card);
                }
            }
            lucide.createIcons();
            P.fn.renderSelection();
        }
    
        // ── Tags Browse (main area) ────────────────────────────────────────────
    
        let tagsData = [];
    
        function renderTagBreadcrumb() {
            if (P.activeView !== "tags") {
                P.breadcrumbBar.classList.add("hidden");
                return;
            }
            P.breadcrumbBar.classList.remove("hidden");
            if (!P.activeTagBrowseId) {
                P.breadcrumbBar.innerHTML = `<span class="bc-item bc-current">${t("sidebar.tags")}</span>`;
            } else {
                const tagObj = tagsData.find(x => x.id === P.activeTagBrowseId);
                const color = tagObj ? (tagObj.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(tagObj.name)) % P.TAG_COLORS.length]) : "#888";
                const name = tagObj ? tagObj.name : P.activeTagBrowseId;
                P.breadcrumbBar.innerHTML =
                    `<span class="bc-item bc-link" data-bc="tags">${t("sidebar.tags")}</span>` +
                    '<span class="bc-sep">&#8250;</span>' +
                    '<span class="bc-item bc-current"><span class="tag-dot" style="background:' + color + '"></span> ' + name + '</span>';
                P.breadcrumbBar.querySelector(".bc-link").addEventListener("click", () => {
                    P.activeTagBrowseId = null;
                    loadTagsBrowse();
                });
            }
        }
    
        async function loadTagsBrowse() {
            const hq = P.fn.hiddenQuery();
            tagsData = await P.fn.api("GET", `/api/tags/browse${hq ? "?" + hq : ""}`);
            if (!Array.isArray(tagsData)) tagsData = [];
            renderTagBreadcrumb();
            if (!P.activeTagBrowseId) {
                if (tagsData.length === 0) {
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    P.photoCountH.textContent = "";
                    return;
                }
                P.emptyState.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.fn.clearGrid();
                P.photoCountH.textContent = t("common.tags_count", { count: tagsData.length });
                for (const tag of tagsData) {
                    const card = document.createElement("div");
                    card.className = "country-card";
                    const color = tag.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(tag.name)) % P.TAG_COLORS.length];
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
                        P.activeTagBrowseId = tag.id;
                        loadTagsBrowse();
                    });
                    P.photoGrid.appendChild(card);
                }
            } else {
                const tag = tagsData.find(x => x.id === P.activeTagBrowseId);
                if (tag) {
                    const color = tag.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(tag.name)) % P.TAG_COLORS.length];
                    P.photoCountH.innerHTML = `<span class="tag-dot" style="background:${color}"></span> ${tag.name} — ${t("common.items", { count: tag.photo_count.toLocaleString() })}`;
                }
                P.fn.loadPhotos();
            }
        }
    
        // ── Cameras Browse (main area) ────────────────────────────────────────
    
        let camerasData = [];
    
        function renderCameraBreadcrumb() {
            if (P.activeView !== "cameras") {
                P.breadcrumbBar.classList.add("hidden");
                return;
            }
            P.breadcrumbBar.classList.remove("hidden");
            if (!P.activeCameraBrowseId) {
                P.breadcrumbBar.innerHTML = `<span class="bc-item bc-current">${t("sidebar.cameras")}</span>`;
            } else {
                P.breadcrumbBar.innerHTML =
                    `<span class="bc-item bc-link" data-bc="cameras">${t("sidebar.cameras")}</span>` +
                    '<span class="bc-sep">&#8250;</span>' +
                    '<span class="bc-item bc-current">' + P.activeCameraBrowseId + '</span>';
                P.breadcrumbBar.querySelector(".bc-link").addEventListener("click", () => {
                    P.activeCameraBrowseId = null;
                    loadCamerasBrowse();
                });
            }
        }
    
        async function loadCamerasBrowse() {
            const hq = P.fn.hiddenQuery();
            camerasData = await P.fn.api("GET", `/api/cameras/browse${hq ? "?" + hq : ""}`);
            if (!Array.isArray(camerasData)) camerasData = [];
            renderCameraBreadcrumb();
            if (!P.activeCameraBrowseId) {
                if (camerasData.length === 0) {
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    P.photoCountH.textContent = "";
                    return;
                }
                P.emptyState.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.fn.clearGrid();
                P.photoCountH.textContent = `${camerasData.length} cameras`;
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
                        P.activeCameraBrowseId = c.name;
                        loadCamerasBrowse();
                    });
                    P.photoGrid.appendChild(card);
                }
            } else {
                P.photoCountH.innerHTML = `&#128247; ${P.activeCameraBrowseId}`;
                P.fn.loadPhotos();
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
            if (P.activeView === "folders") {
                renderFolderBreadcrumb();
                return;
            }
            if (P.activeView === "tags") {
                renderTagBreadcrumb();
                return;
            }
            if (P.activeView === "cameras") {
                renderCameraBreadcrumb();
                return;
            }
            if (P.activeView !== "countries") {
                P.breadcrumbBar.classList.add("hidden");
                return;
            }
            P.breadcrumbBar.classList.remove("hidden");
            if (!P.activeCountryCode) {
                P.breadcrumbBar.innerHTML = `<span class="bc-item bc-current">${t("sidebar.countries")}</span>`;
            } else {
                const c = countriesData.find(x => x.code === P.activeCountryCode);
                const name = c ? `${countryFlag(c.code)} ${c.name}` : P.activeCountryCode;
                P.breadcrumbBar.innerHTML =
                    `<span class="bc-item bc-link" data-bc="countries">${t("sidebar.countries")}</span>` +
                    '<span class="bc-sep">›</span>' +
                    '<span class="bc-item bc-current">' + name + '</span>';
                P.breadcrumbBar.querySelector(".bc-link").addEventListener("click", () => {
                    P.activeCountryCode = null;
                    loadCountries();
                });
            }
        }
    
        async function loadCountries() {
            const hq = P.fn.hiddenQuery();
            countriesData = await P.fn.api("GET", `/api/countries${hq ? "?" + hq : ""}`);
            if (!Array.isArray(countriesData)) countriesData = [];
            renderBreadcrumb();
            if (!P.activeCountryCode) {
                if (countriesData.length === 0) {
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    P.photoCountH.textContent = "";
                    return;
                }
                P.emptyState.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.photoCountH.textContent = `${countriesData.length} countries`;
                P.fn.clearGrid();
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
                        P.activeCountryCode = c.code;
                        loadCountries();
                    });
                    P.photoGrid.appendChild(card);
                }
            } else {
                const c = countriesData.find(x => x.code === P.activeCountryCode);
                if (c) P.photoCountH.innerHTML = `${countryFlag(c.code)} ${c.name} — ${t("common.items", { count: c.photo_count.toLocaleString() })}`;
                P.fn.loadPhotos();
            }
        }
    
    
    // --- exports ---
        P.fn.loadFolderBrowse = loadFolderBrowse;
        P.fn.loadCollectionsBrowse = loadCollectionsBrowse;
        P.fn.loadTagsBrowse = loadTagsBrowse;
        P.fn.loadCamerasBrowse = loadCamerasBrowse;
        P.fn.loadCountries = loadCountries;
})(window.PhotoApp = window.PhotoApp || {});
