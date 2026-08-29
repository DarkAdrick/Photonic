// Photonic module: state
(function (P) {
         P.activeFolderId = null;
         P.activeCollectionId = null;
         P.activeTagId = null;
         P.activeTagBrowseId = null;
         P.activeCameraBrowseId = null;
         P.activeCountryCode = null;
         P.activeView = "library";
         P.cleaningTab = "duplicates";
         P.selectedIds = new Set();
         P.folderBrowsePath = [];
         P.collectionBrowsePath = [];
    
         P.TAG_COLORS = [
            "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
            "#3498db", "#9b59b6", "#e84393", "#fd79a8", "#00cec9",
            "#6c5ce7", "#a29bfe", "#ffeaa7", "#fab1a0", "#74b9ff",
            "#55efc4", "#dfe6e9", "#636e72", "#b2bec3", "#2d3436",
        ];
         P.scanPollCount = 0;
         P.scanPolling = false;
         P.lastScanRefresh = 0;
         P.searchTimeout = null;
        let mapMoveTimeout = null;
         P.map = null;
         P.clusterGroup = null;
         P.plainGroup = null;
         P.currentPage = 1;
         P.loadingMore = false;
         P.hasMore = true;
         P.currentPhotoIds = [];
    
        function clearGrid() {
            P.photoGrid.querySelectorAll(".photo-card, .country-card, .cleaning-separator").forEach(el => el.remove());
        }
         P.detailIndex = 0;
         P.detailMap = null;
         P.detailRotation = 0;
         P.detailZoom = 100;
         P.detailPanX = 0;
         P.detailPanY = 0;
         P.detailDragging = false;
         P.detailDragStartX = 0;
         P.detailDragStartY = 0;
         P.detailCurrentPhotoId = null;
         P.detailCurrentPhotoData = null;
         P.detailThumbVersion = 0;
         P.pannellumViewer = null;
         P.is360Mode = false;
         P.isCurrentPhoto360Video = false;
         P.video360Canvas = null;
         P.video360Video = null;
         P.video360Raf = null;
         P.video360Yaw = 0;
         P.video360Pitch = 0;
         P.video360Fov = 75;
         P.video360Dragging = false;
         P.video360LastX = 0;
         P.video360LastY = 0;
    
         P.lastSelectedId = null;
         P.isDragging = false;
         P.dragStartId = null;
         P.dragMode = "select";
         P.dragHighlightIds = new Set();
         P.contextMenuPhotoId = null;
         P.dndPhotoIds = [];
    
    // --- exports ---
        P.fn.clearGrid = clearGrid;
})(window.PhotoApp = window.PhotoApp || {});
