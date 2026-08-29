// Photonic module: core
(function (P) {
    P.fn = P.fn || {};
         P.t = window.I18n ? I18n.t.bind(I18n) : (k, p) => String(k);
         P.statusText      = document.getElementById("status-text");
         P.scanProgress    = document.getElementById("scan-progress");
         P.scanFill        = document.getElementById("scan-fill");
         P.scanStatus      = document.getElementById("scan-status");
         P.photoCountH     = document.getElementById("photo-count-header");
         P.emptyState      = document.getElementById("empty-state");
         P.photoGrid       = document.getElementById("photo-grid");
        const selectionBarEl  = document.getElementById("header-photo-grid");
         P.breadcrumbBar   = document.getElementById("breadcrumb-bar");
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
         P.filterCamera    = document.getElementById("filter-camera");
         P.filterLens      = document.getElementById("filter-lens");
         P.filterExt       = document.getElementById("filter-ext");
         P.filterDateFrom  = document.getElementById("filter-date-from");
         P.filterDateTo    = document.getElementById("filter-date-to");
         P.filterRating    = document.getElementById("filter-rating");
         P.filterCountry   = document.getElementById("filter-country");
         P.filterCity      = document.getElementById("filter-city");
         P.filterGeo       = document.getElementById("filter-geo");
         P.filter360       = document.getElementById("filter-360");
         P.btnClearFilters = document.getElementById("btn-clear-filters");
         P.navItems        = document.querySelectorAll("#sidebar nav li");
    
         P.detailOverlay = document.getElementById("photo-detail");
         P.detailImg     = document.getElementById("detail-img");
         P.detailFname   = document.getElementById("detail-filename");
         P.detailMeta    = document.getElementById("detail-meta");
         P.detailMapSec  = document.getElementById("detail-map-section");
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
})(window.PhotoApp = window.PhotoApp || {});
