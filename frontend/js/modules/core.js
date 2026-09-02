// Photonic module: core
(function (P) {
    P.fn = P.fn || {};
         P.t = window.I18n ? I18n.t.bind(I18n) : (k, p) => String(k);
         P.locale = function () { return window.I18n && I18n.getCurrent ? I18n.getCurrent() : undefined; };
         P.singleSelectProxy = function (listEl, kind) {
             return {
                 get value() {
                     if (!listEl) return "";
                     const cb = listEl.querySelector("input[type=checkbox]:checked");
                     return cb ? cb.value : "";
                 },
                 set value(v) {
                     if (!listEl) return;
                     const want = v ? String(v) : "";
                     listEl.querySelectorAll("input[type=checkbox]").forEach(cb => {
                         cb.checked = cb.value === want;
                     });
                     if (kind === "device" && P.fn.updateDeviceLabel) P.fn.updateDeviceLabel();
                     if (kind === "place" && P.fn.updatePlaceLabel) P.fn.updatePlaceLabel();
                 }
             };
         };
         P.statusText      = document.getElementById("status-text");
         P.scanProgress    = document.getElementById("scan-progress");
         P.scanFill        = document.getElementById("scan-fill");
         P.scanStatus      = document.getElementById("scan-status");
         P.photoCountH     = document.getElementById("photo-count-header");
         P.emptyState      = document.getElementById("empty-state");
         P.photoGrid       = document.getElementById("photo-grid");
        const selectionBarEl  = document.getElementById("header-photo-grid");
         P.breadcrumbBar   = document.getElementById("breadcrumb-bar");
         P.viewTitleBar    = document.getElementById("view-title-bar");
         P.mapView         = document.getElementById("map-view");
         P.mapPhotosHeader = document.getElementById("map-photos-header");
         P.mapPhotoCount   = document.getElementById("map-photo-count");
         P.mapSelectionCount = document.getElementById("map-selection-count");
         P.mapBtnDeselectAll = document.getElementById("map-btn-deselect-all");
         P.mapBtnSelectedOnly = document.getElementById("map-btn-selected-only");
         P.mapPhotos       = document.getElementById("map-photos");
         P.btnAddFolder    = document.getElementById("btn-add-folder");
         P.btnAddFolderSb  = document.getElementById("btn-add-folder-sidebar");
         P.btnRescan       = document.getElementById("btn-rescan");
         P.btnScanCancel   = document.getElementById("btn-scan-cancel");
         P.dialog          = document.getElementById("folder-dialog");
         P.folderInput     = document.getElementById("folder-path");
         P.btnOk           = document.getElementById("btn-dialog-ok");
         P.btnCancel       = document.getElementById("btn-dialog-cancel");
         P.sidebarFilters  = document.getElementById("sidebar-filters");
         P.searchInput     = document.getElementById("search");
         P.filterDrawer    = document.getElementById("filter-drawer");
         P.btnToggleFilters= document.getElementById("btn-toggle-filters");
         P.filterCameraList  = document.getElementById("filter-camera-list");
         P.filterLensList    = document.getElementById("filter-lens-list");
         P.filterDeviceBtn   = document.getElementById("filter-device-btn");
         P.filterDeviceLabel = document.getElementById("filter-device-label");
         P.filterDevicePopover = document.getElementById("filter-device-popover");
         P.filterCamera      = P.singleSelectProxy(P.filterCameraList, "device");
         P.filterLens        = P.singleSelectProxy(P.filterLensList, "device");
         P.filterExtList   = document.getElementById("filter-ext-list");
         P.filterExt       = {
             get value() {
                 if (!P.filterExtList) return "";
                 return Array.from(P.filterExtList.querySelectorAll("input[type=checkbox]:checked"))
                     .map(cb => cb.value).join(",");
             },
             set value(v) {
                 if (!P.filterExtList) return;
                 const want = v ? String(v).split(",") : [];
                 P.filterExtList.querySelectorAll("input[type=checkbox]").forEach(cb => {
                     cb.checked = want.includes(cb.value);
                 });
                 if (P.fn.updateFormatLabel) P.fn.updateFormatLabel();
             }
         };
         P.filterTypeImage = document.getElementById("filter-type-image");
         P.filterTypeVideo = document.getElementById("filter-type-video");
         P.filterFormatBtn = document.getElementById("filter-format-btn");
         P.filterFormatLabel = document.getElementById("filter-format-label");
         P.filterFormatPopover = document.getElementById("filter-format-popover");
         P.filterDateFrom  = document.getElementById("filter-date-from");
         P.filterDateTo    = document.getElementById("filter-date-to");
         P.filterRating    = document.getElementById("filter-rating");
         P.filterCountryList = document.getElementById("filter-country-list");
         P.filterCityList    = document.getElementById("filter-city-list");
         P.filterPlaceBtn    = document.getElementById("filter-place-btn");
         P.filterPlaceLabel  = document.getElementById("filter-place-label");
         P.filterPlacePopover = document.getElementById("filter-place-popover");
         P.filterCountry     = P.singleSelectProxy(P.filterCountryList, "place");
         P.filterCity        = P.singleSelectProxy(P.filterCityList, "place");
         P.filterGeo       = document.getElementById("filter-geo");
         P.filter360       = document.getElementById("filter-360");
         P.filterHidden    = document.getElementById("filter-hidden");
         P.btnClearFilters = document.getElementById("btn-clear-filters");
         P.navItems        = document.querySelectorAll("#sidebar nav li");
    
         P.detailOverlay = document.getElementById("photo-detail");
         P.detailImg     = document.getElementById("detail-img");
         P.detailFname   = document.getElementById("detail-filename");
         P.detailMeta    = document.getElementById("detail-meta");
         P.detailMapSec  = document.getElementById("detail-map-section");
         P.detailMapEl   = document.getElementById("detail-map");
         P.detailCoords  = document.getElementById("detail-coords");
         P.detailCollections = document.getElementById("detail-collections");
         P.detailTags    = document.getElementById("detail-tags");
         P.detailRating  = document.getElementById("detail-rating");
         P.detailCounter = document.getElementById("detail-counter");
         P.detailClose   = document.getElementById("detail-close");
         P.detailPrev    = document.getElementById("detail-prev");
         P.detailNext    = document.getElementById("detail-next");
         P.detailRotateCW  = document.getElementById("detail-rotate-cw");
         P.detailRotateCCW = document.getElementById("detail-rotate-ccw");
         P.detailStage     = document.getElementById("detail-stage");
         P.detailZoomSlider = document.getElementById("detail-zoom");
         P.detailZoomLabel  = document.getElementById("detail-zoom-label");
         P.detail360Btn     = document.getElementById("detail-360");
         P.detail360Viewer  = document.getElementById("detail-360-viewer");
         P.detailVideo      = document.getElementById("detail-video");
         P.detailFooterCenter = document.querySelector(".detail-footer-center");
         P.detailFooterRight  = document.querySelector(".detail-footer-right");
         P.detailFullscreenBtn = document.getElementById("detail-fullscreen-btn");
    
         P.mapResize    = document.getElementById("map-resize");
         P.contextMenu  = document.getElementById("context-menu");
    
         P.tagDialog      = document.getElementById("tag-dialog");
         P.tagDialogTitle = document.getElementById("tag-dialog-title");
         P.tagInput       = document.getElementById("tag-input");
         P.tagColorPalette= document.getElementById("tag-color-palette");
         P.tagColorPicker = document.getElementById("tag-color-picker");
         P.tagColorHex    = document.getElementById("tag-color-hex");
         P.tagExistingList= document.getElementById("tag-existing-list");
         P.tagDialogOk    = document.getElementById("tag-dialog-ok");
         P.tagDialogCancel= document.getElementById("tag-dialog-cancel");
    
         P.collectionDialog      = document.getElementById("collection-dialog");
         P.collectionDialogTitle = document.getElementById("collection-dialog-title");
         P.collectionInput       = document.getElementById("collection-input");
         P.collectionIconInput   = document.getElementById("collection-icon-input");
         P.collectionIconPicker  = document.getElementById("collection-icon-picker");
         P.collectionIconSelected= document.getElementById("collection-icon-selected");
         P.collectionParentSelect= document.getElementById("collection-parent-select");
         P.collectionColorPalette= document.getElementById("collection-color-palette");
         P.collectionColorPicker = document.getElementById("collection-color-picker");
         P.collectionColorHex    = document.getElementById("collection-color-hex");
         P.collectionDialogOk    = document.getElementById("collection-dialog-ok");
         P.collectionDialogCancel= document.getElementById("collection-dialog-cancel");
    
         P.collectionExistingList    = document.getElementById("collection-existing-list");
        const collectionExistingSection = document.getElementById("collection-existing-section");
    
         P.tagModalPhotoId = null;
         P.tagModalBatchIds = null;
         P.tagModalSelectedColor = null;
         P.tagModalExistingTags = [];
    
         P.collectionModalPhotoId = null;
         P.collectionModalBatchIds = null;
         P.collectionModalSelectedColor = null;
         P.pendingCollectionAssignIds = null;
         P.collectionModalExistingCollections = [];
    
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
    
         P.cleaningToolbar = document.getElementById("cleaning-toolbar");
         P.cleaningTabs    = document.querySelectorAll(".cleaning-tab");
         P.btnAnalyze      = document.getElementById("btn-analyze");
         P.cleaningStatus  = document.getElementById("cleaning-status");
         P.statsView       = document.getElementById("stats-view");
    
    // --- exports ---
        P.fn.showConfirm = showConfirm;
        P.fn.hiddenQuery = function () {
            if (P.hiddenFilter === "all") return "show_hidden=1";
            if (P.hiddenFilter === "only") return "hidden_only=1";
            return "";
        };
        P.fn.isPhotoHidden = function (p) {
            return !!(p && (p.hidden === true || p.is_hidden === 1));
        };
        P.fn.renderHiddenBadge = function (p) {
            if (!P.fn.isPhotoHidden(p)) return "";
            return '<div class="photo-hidden-overlay"><i data-lucide="eye-off"></i><span data-i18n="common.hidden">Hidden</span></div>';
        };
        P.fn.getSelectionHiddenInfo = function (ids) {
            const cards = P.fn.getVisiblePhotoCards();
            let hidden = 0, shown = 0;
            for (const id of ids) {
                const card = cards.find(c => parseInt(c.dataset.photoId) === id);
                if (!card) continue;
                if (card.classList.contains("photo-card-hidden")) hidden++;
                else shown++;
            }
            return { hidden: hidden, shown: shown };
        };
        P.fn.setDnDGhost = function (e, card, count) {
            if (P.dndGhost) { P.dndGhost.remove(); P.dndGhost = null; }
            if (!e || !e.dataTransfer || !card) return;
            const ghost = document.createElement("div");
            ghost.className = "dnd-ghost";
            const img = card.querySelector("img");
            if (img) {
                const g = img.cloneNode(false);
                g.className = "dnd-ghost-img";
                ghost.appendChild(g);
            }
            if (count >= 1) {
                const badge = document.createElement("div");
                badge.className = "dnd-ghost-badge";
                badge.textContent = String(count);
                ghost.appendChild(badge);
            }
            document.body.appendChild(ghost);
            try {
                e.dataTransfer.setDragImage(ghost, 36, 38);
            } catch (_) {}
            P.dndGhost = ghost;
        };
        P.fn.clearDnDGhost = function () {
            if (P.dndGhost) { P.dndGhost.remove(); P.dndGhost = null; }
        };
})(window.PhotoApp = window.PhotoApp || {});
