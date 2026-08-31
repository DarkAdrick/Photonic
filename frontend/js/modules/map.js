// Photonic module: map
(function (P) {
    const t = P.t;
        // ── Map ───────────────────────────────────────────────────────────────
    
        async function fitMapToFolder() {
            if (!P.map) return;
            const params = new URLSearchParams();
            if (P.activeFolderId) params.set("folder_id", P.activeFolderId);
            if (P.activeCollectionId) params.set("collection_id", P.activeCollectionId);
            if (P.filterCountry.value) params.set("country", P.filterCountry.value);
            if (P.filterCity.value) params.set("city", P.filterCity.value);
            if (P.filterCamera.value) params.set("camera", P.filterCamera.value);
            if (P.filterLens.value) params.set("lens", P.filterLens.value);
            if (P.filterExt.value) params.set("ext", P.filterExt.value);
            if (P.filterDateFrom.value) params.set("date_from", P.filterDateFrom.value);
            if (P.filterDateTo.value) params.set("date_to", P.filterDateTo.value);
            if (P.filterRating.value) params.set("rating", P.filterRating.value);
            const q = P.searchInput.value.trim();
            if (q) params.set("q", q);
            if (P.hiddenFilter === "all") params.set("show_hidden", "1");
            else if (P.hiddenFilter === "only") params.set("hidden_only", "1");
            let url = "/api/photos/geo/bounds";
            const qs = params.toString();
            if (qs) url += "?" + qs;
            const data = await P.fn.api("GET", url);
            if (data.count > 0) {
                P.map.fitBounds([[data.south, data.west], [data.north, data.east]], { padding: [30, 30], maxZoom: 12 });
            }
        }
    
        function initMap() {
            if (P.map) return;
            P.map = L.map("map-view", {
                noWrap: true,
                worldCopyJump: false,
                minZoom: 2,
                // Bounds cover exactly one world so the tile layer never wraps
                // horizontally or vertically (no repeated world copies).
                maxBounds: [[-89, -180], [89, 180]],
                maxBoundsViscosity: 1.0,
            }).setView([46.6, 2.3], 6);
            const mapLoader = P.fn.createLoader(t("map.loading"));
            mapLoader.id = "map-loader";
            P.mapView.appendChild(mapLoader);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap",
                maxZoom: 20,
            }).addTo(P.map);
            P.clusterGroup = L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false, disableClusteringAtZoom: 18 });
            P.plainGroup = L.layerGroup();
            P.map.addLayer(P.clusterGroup);
            P.map.on("moveend", () => loadMapPhotos());
            setTimeout(() => P.map.invalidateSize(), 100);
        }
    
        let mapLoadTimer = null;
    
        function loadMapPhotos() {
            if (!P.map) return;
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
    
         P.lastMapQueryUrl = null;
    
        async function loadMapPhotosInner() {
            const b = P.map.getBounds();
            let url = `/api/photos/geo?south=${b.getSouth()}&west=${b.getWest()}&north=${b.getNorth()}&east=${b.getEast()}`;
            if (P.activeFolderId) url += `&folder_id=${activeFolderId}`;
            if (P.activeCollectionId) url += `&collection_id=${activeCollectionId}`;
            if (P.filterCountry.value) url += `&country=${encodeURIComponent(filterCountry.value)}`;
            if (P.filterCity.value) url += `&city=${encodeURIComponent(filterCity.value)}`;
            if (P.filterCamera.value) url += `&camera=${encodeURIComponent(filterCamera.value)}`;
            if (P.filterLens.value) url += `&lens=${encodeURIComponent(filterLens.value)}`;
            if (P.filterExt.value) url += `&ext=${encodeURIComponent(filterExt.value)}`;
            if (P.filterDateFrom.value) url += `&date_from=${filterDateFrom.value}`;
            if (P.filterDateTo.value) url += `&date_to=${filterDateTo.value}`;
            if (P.filterRating.value) url += `&rating=${filterRating.value}`;
            const q = P.searchInput.value.trim();
            if (q) url += `&q=${encodeURIComponent(q)}`;
            const hq = P.fn.hiddenQuery();
            if (hq) url += `&${hq}`;
            if (url === P.lastMapQueryUrl) return;
            const data = await P.fn.api("GET", url);
            P.lastMapQueryUrl = url;
    
            P.clusterGroup.clearLayers();
            P.plainGroup.clearLayers();
            if (P.map.hasLayer(P.clusterGroup)) P.map.removeLayer(P.clusterGroup);
            if (P.map.hasLayer(P.plainGroup)) P.map.removeLayer(P.plainGroup);
    
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
                const zoom = P.map.getZoom();
                const center = P.map.getCenter();
                const centerPx = P.map.project(center, zoom);
                const radiusPx = 40;
                const dLng = Math.max(1e-6, Math.abs(P.map.unproject(L.point(centerPx.x + radiusPx, centerPx.y), zoom).lng - center.lng));
                const dLat = Math.max(1e-6, Math.abs(P.map.unproject(L.point(centerPx.x, centerPx.y + radiusPx), zoom).lat - center.lat));
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
            P.map.addLayer(P.clusterGroup);
            P.map.addLayer(P.plainGroup);
    
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
                    m.on("click", () => P.fn.openDetail(ph.id));
                    return m;
                });
                P.clusterGroup.addLayers(lot);
                done += lot.length;
                updateProgress();
                await yieldForUi();
            }
            for (let i = 0; i < sparsePhotos.length; i += CHUNK) {
                const end = Math.min(i + CHUNK, sparsePhotos.length);
                for (let j = i; j < end; j++) {
                    const ph = sparsePhotos[j];
                    const m = L.marker([ph.lat, ph.lng]);
                    m.on("click", () => P.fn.openDetail(ph.id));
                    P.plainGroup.addLayer(m);
                    done++;
                }
                updateProgress();
                await yieldForUi();
            }
    
            mapStripQueue = data.photos.slice();
            if (mapStripObserver) mapStripObserver.disconnect();
            P.mapPhotos.innerHTML = "";
            mapSentinel = document.createElement("div");
            mapSentinel.className = "map-strip-sentinel";
            P.mapPhotos.appendChild(mapSentinel);
            if (mapStripObserver) mapStripObserver.observe(mapSentinel);
            fillMapStripViewport();
            P.fn.renderSelection();
            P.photoCountH.textContent = t("map.geo_tagged", { count: data.total.toLocaleString() });
            if (P.mapPhotoCount) P.mapPhotoCount.textContent = t("common.items", { count: data.total.toLocaleString() });
        }
    
        let mapStripQueue = [];
        let mapSentinel = null;
    
        function renderMapStripChunk() {
            const CHUNK = 80;
            const items = mapStripQueue.splice(0, CHUNK);
            const frag = document.createDocumentFragment();
            for (const p of items) {
                const card = document.createElement("div");
                card.className = "photo-card" + (P.fn.isPhotoHidden(p) ? " photo-card-hidden" : "");
                card.dataset.photoId = p.id;
                let badge = "";
                if (P.fn.is360Photo(p)) {
                    badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
                } else if (P.fn.isVideo(p)) {
                    badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
                }
                card.innerHTML = `
                    <img src="${p.thumb}" alt="${p.filename}" loading="lazy" decoding="async">
                    ${badge}
                    ${P.fn.renderHiddenBadge(p)}
                    ${P.fn.renderMetaBadges(p)}
                `;
                frag.appendChild(card);
            }
            if (items.length) P.mapPhotos.insertBefore(frag, mapSentinel);
            lucide.createIcons();
        }
    
        function fillMapStripViewport() {
            let guard = 0;
            while (mapStripQueue.length > 0 && guard < 200) {
                const r = mapSentinel.getBoundingClientRect();
                const rr = P.mapPhotos.getBoundingClientRect();
                if (r.top > rr.bottom + 900) break;
                renderMapStripChunk();
                guard++;
            }
            if (mapStripQueue.length === 0 && mapStripObserver) mapStripObserver.disconnect();
        }
    
        const mapStripObserver = ("IntersectionObserver" in window)
            ? new IntersectionObserver(() => fillMapStripViewport(), { root: P.mapPhotos, rootMargin: "900px 0px" })
            : null;
    
    
    // --- exports ---
        P.fn.fitMapToFolder = fitMapToFolder;
        P.fn.initMap = initMap;
        P.fn.loadMapPhotos = loadMapPhotos;
})(window.PhotoApp = window.PhotoApp || {});
