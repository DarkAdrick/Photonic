// Photonic module: grid
(function (P) {
    const t = P.t;
        // ── Photo Grid ────────────────────────────────────────────────────────
    
        async function loadPhotos(reset = true) {
            const usesGrid = P.activeView === "library" || P.activeView === "cleaning" || (P.activeView === "countries" && P.activeCountryCode) || (P.activeView === "tags" && P.activeTagBrowseId) || (P.activeView === "cameras" && P.activeCameraBrowseId);
            if (!usesGrid) return;
            if (P.loadingMore) return;
            if (reset) {
                P.currentPage = 1;
                P.hasMore = true;
                P.fn.clearGrid();
            }
            if (!P.hasMore) return;
    
            do {
                P.loadingMore = true;
                const params = P.fn.getFilterParams();
                params.set("per_page", "200");
                params.set("page", P.currentPage);
                const data = await P.fn.api("GET", `/api/photos?${params.toString()}`);
                P.loadingMore = false;
    
                if (data.total === 0 && P.currentPage === 1) {
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    P.photoCountH.textContent = "";
                    return;
                }
                P.emptyState.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.photoCountH.textContent = t("common.items", { count: data.total.toLocaleString() });
    
                for (const p of data.photos) {
                    const card = document.createElement("div");
                    card.className = "photo-card";
                    card.dataset.photoId = p.id;
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
                        ${P.fn.renderMetaBadges(p)}
                        <div class="photo-label">${p.filename}</div>
                    `;
                    card.addEventListener("click", () => P.fn.openDetail(p.id));
                    P.photoGrid.appendChild(card);
                }
                lucide.createIcons();
                P.hasMore = data.photos.length === 200;
                P.currentPage++;
            } while (P.hasMore && P.photoGrid.scrollHeight <= P.photoGrid.clientHeight);
        }
    
        P.photoGrid.addEventListener("scroll", () => {
            if (P.activeView !== "library" && !(P.activeView === "countries" && P.activeCountryCode) && !(P.activeView === "tags" && P.activeTagBrowseId) && !(P.activeView === "cameras" && P.activeCameraBrowseId)) return;
            const thumbPx = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || 150;
            const threshold = thumbPx * 4;
            if (P.photoGrid.scrollTop + P.photoGrid.clientHeight >= P.photoGrid.scrollHeight - threshold) {
                loadPhotos(false);
            }
        });
    
        // ── Selection & Context Menu ──────────────────────────────────────────
    
        function getVisiblePhotoCards() {
            const cards = Array.from(P.photoGrid.querySelectorAll(".photo-card[data-photo-id]"));
            if (!P.mapPhotos.classList.contains("hidden")) {
                cards.push(...mapPhotos.querySelectorAll(".photo-card[data-photo-id]"));
            }
            return cards;
        }
    
        function getPhotoCardIds() {
            return getVisiblePhotoCards().map(c => parseInt(c.dataset.photoId));
        }
    
        function renderSelection() {
            const hasSel = P.selectedIds.size > 0;
            P.photoGrid.classList.toggle("has-selection", hasSel);
            P.mapPhotos.classList.toggle("has-selection", hasSel);
            for (const card of getVisiblePhotoCards()) {
                const id = parseInt(card.dataset.photoId);
                card.classList.toggle("selected", P.selectedIds.has(id));
            }
            document.querySelectorAll(".cleaning-card input[type=checkbox]").forEach(cb => {
                const id = parseInt(cb.dataset.id);
                cb.checked = P.selectedIds.has(id);
            });
    
        }
    
        function selectPhoto(id, mode) {
            if (mode === "toggle") {
                if (P.selectedIds.has(id)) {
                    P.selectedIds.delete(id);
                } else {
                    P.selectedIds.add(id);
                }
                P.lastSelectedId = id;
            } else if (mode === "range") {
                if (P.lastSelectedId == null) {
                    P.selectedIds.add(id);
                    P.lastSelectedId = id;
                } else {
                    const ids = getPhotoCardIds();
                    const a = ids.indexOf(P.lastSelectedId);
                    const b = ids.indexOf(id);
                    if (a !== -1 && b !== -1) {
                        const start = Math.min(a, b);
                        const end = Math.max(a, b);
                        for (let i = start; i <= end; i++) P.selectedIds.add(ids[i]);
                    }
                    P.lastSelectedId = id;
                }
            } else if (mode === "deselect") {
                P.selectedIds.delete(id);
                P.lastSelectedId = id;
            } else if (mode === "deselect-range") {
                if (P.lastSelectedId == null) {
                    P.selectedIds.delete(id);
                } else {
                    const ids = getPhotoCardIds();
                    const a = ids.indexOf(P.lastSelectedId);
                    const b = ids.indexOf(id);
                    if (a !== -1 && b !== -1) {
                        const start = Math.min(a, b);
                        const end = Math.max(a, b);
                        for (let i = start; i <= end; i++) P.selectedIds.delete(ids[i]);
                    }
                }
                P.lastSelectedId = id;
            }
            renderSelection();
        }
    
        function selectAll() {
            for (const card of getVisiblePhotoCards()) {
                P.selectedIds.add(parseInt(card.dataset.photoId));
            }
            renderSelection();
        }
    
        function deselectAll() {
            P.selectedIds.clear();
            P.lastSelectedId = null;
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
                if (P.dragHighlightIds.has(id)) {
                    card.classList.add(P.dragMode === "select" ? "drag-highlight" : "drag-highlight-deselect");
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
                P.isDragging = true;
                P.dragStartId = id;
                P.dragMode = "select";
                return;
            }
            if (ctrl && !alt && shift) {
                e.preventDefault();
                selectPhoto(id, "range");
                P.isDragging = true;
                P.dragStartId = id;
                P.dragMode = "select";
                return;
            }
            if (ctrl && alt && !shift) {
                e.preventDefault();
                selectPhoto(id, "deselect");
                P.isDragging = true;
                P.dragStartId = id;
                P.dragMode = "deselect";
                return;
            }
            if (ctrl && alt && shift) {
                e.preventDefault();
                selectPhoto(id, "deselect-range");
                P.isDragging = true;
                P.dragStartId = id;
                P.dragMode = "deselect";
                return;
            }
        }
    
        function gridMouseMove(e) {
            if (!P.isDragging) return;
            const id = getPhotoIdFromEvent(e);
            if (id == null) return;
            P.dragHighlightIds = new Set(getDragRangeIds(P.dragStartId, id));
            updateDragHighlights();
        }
    
        document.addEventListener("mouseup", () => {
            if (!P.isDragging) return;
            P.isDragging = false;
            if (P.dragMode === "select") {
                for (const id of P.dragHighlightIds) P.selectedIds.add(id);
            } else {
                for (const id of P.dragHighlightIds) P.selectedIds.delete(id);
            }
            P.dragHighlightIds.clear();
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
            P.fn.openDetail(id);
        }
    
        P.photoGrid.addEventListener("mousedown", gridMouseDown);
        P.mapPhotos.addEventListener("mousedown", gridMouseDown);
        P.photoGrid.addEventListener("mousemove", gridMouseMove);
        P.mapPhotos.addEventListener("mousemove", gridMouseMove);
        P.photoGrid.addEventListener("click", gridClickCapture, true);
        P.mapPhotos.addEventListener("click", gridClickCapture, true);
    
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
            P.dndPhotoIds = (P.selectedIds.has(id) && P.selectedIds.size > 0)
                ? Array.from(P.selectedIds)
                : [id];
            card.classList.add("dragging");
            e.stopPropagation();
            try {
                e.dataTransfer.setData(DND_MIME, JSON.stringify(P.dndPhotoIds));
                e.dataTransfer.setData("text/plain", P.dndPhotoIds.join(","));
            } catch (_) {}
            e.dataTransfer.effectAllowed = "copy";
        }
    
        function gridDragEnd(e) {
            const card = e.target.closest(".photo-card");
            if (card) card.classList.remove("dragging");
            P.dndPhotoIds = [];
        }
    
        P.photoGrid.addEventListener("dragstart", gridDragStart);
        P.mapPhotos.addEventListener("dragstart", gridDragStart);
        P.photoGrid.addEventListener("dragend", gridDragEnd);
        P.mapPhotos.addEventListener("dragend", gridDragEnd);
    
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
            P.contextMenuPhotoId = id;
            if (P.selectedIds.has(id)) {
                contextMenuTargets = Array.from(P.selectedIds);
            } else {
                contextMenuTargets = [id];
            }
            showContextMenu(e.clientX, e.clientY);
        }
    
        P.photoGrid.addEventListener("contextmenu", gridContextMenu);
        P.mapPhotos.addEventListener("contextmenu", gridContextMenu);
    
        function showContextMenu(x, y) {
            const count = contextMenuTargets.length;
            const header = document.getElementById("context-header");
            header.textContent = count === 1 ? t("common.item") : t("common.items", { count: count });
    
            P.contextMenu.classList.remove("hidden");
            const mw = P.contextMenu.offsetWidth;
            const mh = P.contextMenu.offsetHeight;
            P.contextMenu.style.left = Math.min(x, window.innerWidth - mw - 4) + "px";
            P.contextMenu.style.top = Math.min(y, window.innerHeight - mh - 4) + "px";
    
            const isCleaning = P.activeView === "cleaning";
            const isMulti = count > 1;
    
            P.contextMenu.querySelector('[data-action="open"]').classList.toggle("disabled", isMulti);
            P.contextMenu.querySelector('[data-action="select"]').classList.toggle("hidden", isMulti);
            P.contextMenu.querySelector('[data-action="deselect"]').classList.toggle("hidden", isMulti);
            P.contextMenu.querySelector('[data-action="add-tag"]').classList.toggle("hidden", isCleaning);
            P.contextMenu.querySelector('[data-action="remove-tags"]').classList.toggle("hidden", isCleaning);
            P.contextMenu.querySelector('[data-action="add-collection"]').classList.toggle("hidden", isCleaning);
            P.contextMenu.querySelector('[data-action="remove-collections"]').classList.toggle("hidden", isCleaning);
    
            const visibleItems = P.contextMenu.querySelectorAll(".context-item:not(.hidden)");
            visibleItems.forEach(item => item.classList.remove("striped"));
            visibleItems.forEach((item, i) => { if (i % 2 === 1) item.classList.add("striped"); });
        }
    
        function hideContextMenu() {
            P.contextMenu.classList.add("hidden");
            P.contextMenuPhotoId = null;
            contextMenuTargets = [];
        }
    
        P.contextMenu.addEventListener("click", (e) => {
            const item = e.target.closest(".context-item");
            if (!item || item.classList.contains("disabled")) return;
            const action = item.dataset.action;
            const targets = contextMenuTargets;
    
            if (action === "open") {
                if (targets.length === 1) P.fn.openDetail(targets[0]);
            } else if (action === "select") {
                for (const id of targets) P.selectedIds.add(id);
                P.lastSelectedId = targets[targets.length - 1];
                renderSelection();
            } else if (action === "deselect") {
                for (const id of targets) P.selectedIds.delete(id);
                P.lastSelectedId = null;
                renderSelection();
            } else if (action === "select-all") {
                selectAll();
            } else if (action === "deselect-all") {
                deselectAll();
            } else if (action === "add-tag") {
                if (targets.length === 1) {
                    P.fn.openTagModal(targets[0]);
                } else {
                    P.fn.openTagModalBatch(targets);
                }
            } else if (action === "remove-tags") {
                P.fn.removeTagsFromTargets(targets);
            } else if (action === "add-collection") {
                if (targets.length === 1) {
                    P.fn.openCollectionModal(targets[0]);
                } else {
                    P.fn.openCollectionModalBatch(targets);
                }
            } else if (action === "remove-collections") {
                P.fn.removeCollectionsFromTargets(targets);
            } else if (action === "delete") {
                const ids = targets.length > 0 ? targets : Array.from(P.selectedIds);
                if (ids.length > 0) P.fn.confirmDelete(ids);
            }
            hideContextMenu();
        });
    
        document.addEventListener("click", (e) => {
            if (!P.contextMenu.contains(e.target)) hideContextMenu();
        });
        document.addEventListener("contextmenu", (e) => {
            if (!P.photoGrid.contains(e.target) && !P.mapPhotos.contains(e.target)) hideContextMenu();
        });
    
        // ── Selection Bar ────────────────────────────────────────────────────
    
        const selectionCount = document.getElementById("selection-count");
        const btnDeselectAll = document.getElementById("btn-deselect-all");
        const btnSelectedOnly = document.getElementById("btn-selected-only");
        let selectedOnlyActive = false;
    
        function applySelectedOnlyFilter() {
            P.photoGrid.classList.toggle("selected-only", selectedOnlyActive);
            P.mapPhotos.classList.toggle("selected-only", selectedOnlyActive);
        }
    
        function toggleSelectedOnly() {
            selectedOnlyActive = !selectedOnlyActive;
            btnSelectedOnly.classList.toggle("active", selectedOnlyActive);
            P.mapBtnSelectedOnly.classList.toggle("active", selectedOnlyActive);
            applySelectedOnlyFilter();
        }
    
        btnSelectedOnly.addEventListener("click", toggleSelectedOnly);
        P.mapBtnSelectedOnly.addEventListener("click", toggleSelectedOnly);
        btnDeselectAll.addEventListener("click", deselectAll);
        P.mapBtnDeselectAll.addEventListener("click", deselectAll);
    
        function updateSelectionBar() {
            const n = P.selectedIds.size;
            if (n === 0 && selectedOnlyActive) {
                selectedOnlyActive = false;
                btnSelectedOnly.classList.remove("active");
                P.mapBtnSelectedOnly.classList.remove("active");
                applySelectedOnlyFilter();
            }
            selectionCount.textContent = n > 0 ? t("grid.selected", { count: n }) : "";
            selectionCount.classList.toggle("hidden", n === 0);
            btnDeselectAll.classList.toggle("hidden", n === 0);
            btnSelectedOnly.classList.toggle("hidden", n === 0);
            if (P.mapSelectionCount) {
                P.mapSelectionCount.textContent = n > 0 ? t("grid.selected", { count: n }) : "";
                P.mapSelectionCount.classList.toggle("hidden", n === 0);
            }
            if (P.mapBtnDeselectAll) P.mapBtnDeselectAll.classList.toggle("hidden", n === 0);
            if (P.mapBtnSelectedOnly) P.mapBtnSelectedOnly.classList.toggle("hidden", n === 0);
        }
    
        document.addEventListener("keydown", (e) => {
            if ((e.key === "Escape") && selectedOnlyActive) {
                selectedOnlyActive = false;
                btnSelectedOnly.classList.remove("active");
                P.mapBtnSelectedOnly.classList.remove("active");
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
            if (P.activeView === "locations") {
                P.fn.loadMapPhotos();
            } else if (P.activeView === "countries" && !P.activeCountryCode) {
                P.fn.loadCountries();
            } else if (P.activeView === "cameras" && !P.activeCameraBrowseId) {
                P.fn.loadCamerasBrowse();
            } else if (P.activeView === "folders") {
                P.fn.loadFolderBrowse();
            } else if (P.activeView === "tags" && !P.activeTagBrowseId) {
                P.fn.loadTagsBrowse();
            } else {
                loadPhotos();
            }
        }
    
        function onSearch() {
            clearTimeout(P.searchTimeout);
            P.searchTimeout = setTimeout(() => {
                if (P.activeView === "locations") P.fn.loadMapPhotos();
                else if (P.activeView === "countries" && !P.activeCountryCode) P.fn.loadCountries();
                else if (P.activeView === "cameras" && !P.activeCameraBrowseId) P.fn.loadCamerasBrowse();
                else if (P.activeView === "folders") P.fn.loadFolderBrowse();
                else if (P.activeView === "tags" && !P.activeTagBrowseId) P.fn.loadTagsBrowse();
                else loadPhotos();
            }, 300);
        }
    
        function clearFilters() {
            P.searchInput.value = "";
            P.filterCamera.value = "";
            P.filterLens.value = "";
            P.filterExt.value = "";
            P.filterDateFrom.value = "";
            P.filterDateTo.value = "";
            P.filterRating.value = "";
            P.filterCountry.value = "";
            P.filterCity.value = "";
            P.filterGeo.value = "";
            P.filter360.value = "";
            P.activeTagId = null;
            P.activeCountryCode = null;
            onFilterChange();
        }
    
    
    // --- exports ---
        P.fn.loadPhotos = loadPhotos;
        P.fn.getVisiblePhotoCards = getVisiblePhotoCards;
        P.fn.renderSelection = renderSelection;
        P.fn.deselectAll = deselectAll;
        P.fn.isPhotoDnd = isPhotoDnd;
        P.fn.parsePhotoDnd = parsePhotoDnd;
        P.fn.hideContextMenu = hideContextMenu;
        P.fn.onFilterChange = onFilterChange;
        P.fn.onSearch = onSearch;
        P.fn.clearFilters = clearFilters;
})(window.PhotoApp = window.PhotoApp || {});
