// Photonic module: map
(function (P) {
    const t = P.t;

    // ── Cluster heat gradient ────────────────────────────────────────────────
    // Continuous color scale (blue → cyan → green → yellow → red → violet →
    // dark violet → black) interpolated on a log scale of the photo count, so
    // dense spots smoothly drift toward the hot end instead of jumping through
    // a few fixed, unrelated tiers. The count mapped to the "hottest" (black)
    // end is configurable (1000 → 10000, default 5000).
    const HEAT_STOPS = [
        [50, 90, 255],    // cold blue
        [40, 200, 235],   // cyan
        [90, 215, 70],    // green
        [250, 220, 50],   // yellow
        [250, 90, 45],    // red
        [175, 75, 220],   // violet
        [110, 35, 165],   // dark violet
        [25, 22, 40],     // near black
    ];

    function getHeatMax() {
        const v = parseInt(localStorage.getItem("photonic.heatMax") || "5000") || 5000;
        return Math.min(10000, Math.max(1000, v));
    }

    function getHeatPalette() {
        return {
            mode: localStorage.getItem("photonic.heatPalette") || "heatmap",
            colorLight: localStorage.getItem("photonic.heatColorLight") || "#4caf50",
            colorFull: localStorage.getItem("photonic.heatColorFull") || "#ef4444",
        };
    }

    function hexToRgb(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function mixRgb(a, b, t) {
        return [
            Math.round(a[0] + (b[0] - a[0]) * t),
            Math.round(a[1] + (b[1] - a[1]) * t),
            Math.round(a[2] + (b[2] - a[2]) * t),
        ];
    }

    // Lighten a fully saturated color so it can act as the "cold" end of a
    // single-color ramp: the cluster fades from a pale tint to the full color.
    function lightenRgb(rgb, amt) {
        return [
            Math.round(rgb[0] + (255 - rgb[0]) * amt),
            Math.round(rgb[1] + (255 - rgb[1]) * amt),
            Math.round(rgb[2] + (255 - rgb[2]) * amt),
        ];
    }

    function heatT(count) {
        const heatMax = getHeatMax();
        let tVal = Math.log10(Math.max(2, count)) / Math.log10(heatMax);
        return Math.max(0, Math.min(1, tVal));
    }

    function heatRgb(count) {
        const tVal = heatT(count);
        const palette = getHeatPalette();

        if (palette.mode === "single") {
            const full = hexToRgb(palette.colorFull) || [239, 68, 68];
            return mixRgb(lightenRgb(full, 0.72), full, tVal);
        }

        if (palette.mode === "dual") {
            const light = hexToRgb(palette.colorLight) || [76, 175, 80];
            const full = hexToRgb(palette.colorFull) || [239, 68, 68];
            return mixRgb(light, full, tVal);
        }

        const pos = tVal * (HEAT_STOPS.length - 1);
        const i = Math.max(0, Math.min(HEAT_STOPS.length - 2, Math.floor(pos)));
        const frac = pos - i;
        return mixRgb(HEAT_STOPS[i], HEAT_STOPS[i + 1], frac);
    }

    function cssRgba(rgb, alpha) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }

    function formatClusterCount(count) {
        return String(count);
    }

    function clusterIconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const color = heatRgb(count);
        let tier = "small";
        if (count >= 20) tier = "medium";
        if (count >= 100) tier = "large";
        return L.divIcon({
            html: `<div style="background-color:${cssRgba(color, 0.85)};box-shadow:0 0 0 4px ${cssRgba(color, 0.35)}"><span>${formatClusterCount(count)}</span></div>`,
            className: `marker-cluster marker-cluster-${tier}`,
            iconSize: L.point(40, 40),
        });
    }

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
            if (P.filterTypeImage.checked && !P.filterTypeVideo.checked) params.set("type", "image");
            else if (P.filterTypeVideo.checked && !P.filterTypeImage.checked) params.set("type", "video");
            if (P.filterDateFrom.value) params.set("date_from", P.filterDateFrom.value);
            if (P.filterDateTo.value) params.set("date_to", P.filterDateTo.value);
            if (P.filterRating.value) params.set("rating", P.filterRating.value);
            if (P.filterGeo.value) params.set("geotag_only", P.filterGeo.value);
            const q = P.searchInput.value.trim();
            if (q) params.set("q", q);
            if (P.hiddenFilter === "all") params.set("show_hidden", "1");
            else if (P.hiddenFilter === "only") params.set("hidden_only", "1");
            let url = "/api/photos/geo/bounds";
            const qs = params.toString();
            if (qs) url += "?" + qs;
            const data = await P.fn.api("GET", url);
            if (data.count > 0 && isFinite(data.south) && isFinite(data.west) && isFinite(data.north) && isFinite(data.east)) {
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
            P.tileLayer = P.fn.buildTileLayer();
            P.tileLayer.addTo(P.map);
            P.fn.applyMapTileBackground(P.map);
            P.fn.addTileControl(P.map);
            P.clusterGroup = L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false, disableClusteringAtZoom: 18, iconCreateFunction: clusterIconCreateFunction });
            P.plainGroup = L.layerGroup();
            P.map.addLayer(P.clusterGroup);
            P.map.on("moveend", () => loadMapPhotos());
            setTimeout(() => P.map.invalidateSize(), 100);
            setTimeout(() => P.map.invalidateSize(), 400);
            bindMapDrop();
        }

        // Drag & drop photos from the grid / map strip onto the map to set
        // their location. The drop opens the geotag dialog pre-filled with the
        // coordinates under the pointer.
        function bindMapDrop() {
            const container = P.map.getContainer();
            if (!container) return;
            container.addEventListener("dragover", (e) => {
                if (!P.fn.isPhotoDnd(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                container.classList.add("dragover");
            });
            container.addEventListener("dragleave", (e) => {
                if (!container.contains(e.relatedTarget)) container.classList.remove("dragover");
            });
            container.addEventListener("drop", (e) => {
                container.classList.remove("dragover");
                if (!P.fn.isPhotoDnd(e)) return;
                e.preventDefault();
                const ids = P.fn.parsePhotoDnd(e);
                if (!ids || ids.length === 0) return;
                const point = P.map.containerPointToLatLng(L.point(
                    e.clientX - container.getBoundingClientRect().left,
                    e.clientY - container.getBoundingClientRect().top
                ));
                P.fn.openGeotagModal(ids, { lat: point.lat, lng: point.lng });
            });
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
            if (P.filterCountry.value) url += `&country=${encodeURIComponent(P.filterCountry.value)}`;
            if (P.filterCity.value) url += `&city=${encodeURIComponent(P.filterCity.value)}`;
            if (P.filterCamera.value) url += `&camera=${encodeURIComponent(P.filterCamera.value)}`;
            if (P.filterLens.value) url += `&lens=${encodeURIComponent(P.filterLens.value)}`;
            if (P.filterExt.value) url += `&ext=${encodeURIComponent(P.filterExt.value)}`;
            if (P.filterTypeImage.checked && !P.filterTypeVideo.checked) url += "&type=image";
            else if (P.filterTypeVideo.checked && !P.filterTypeImage.checked) url += "&type=video";
            if (P.filterDateFrom.value) url += `&date_from=${P.filterDateFrom.value}`;
            if (P.filterDateTo.value) url += `&date_to=${P.filterDateTo.value}`;
            if (P.filterRating.value) url += `&rating=${P.filterRating.value}`;
            if (P.filterGeo.value === "0") url += "&geotag_only=0";
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
            const clusterGlobalThreshold = parseInt(localStorage.getItem("photonic.clusterGlobalThreshold") || "500") || 500;
            const clusteringDisabled = data.total < clusterGlobalThreshold;

            const markerPhotos = data.photos.filter(ph => ph.lat != null && ph.lng != null);

            let densePhotos = [];
            let sparsePhotos = [];

            if (!clusteringDisabled) {
                const clusterThreshold = parseInt(localStorage.getItem("photonic.clusterThreshold") || "1") || 1;
                const minClusterSize = Math.max(2, clusterThreshold);
                const zoom = P.map.getZoom();
                const center = P.map.getCenter();
                const centerPx = P.map.project(center, zoom);
                const radiusPx = 40;
                const dLng = Math.max(1e-6, Math.abs(P.map.unproject(L.point(centerPx.x + radiusPx, centerPx.y), zoom).lng - center.lng));
                const dLat = Math.max(1e-6, Math.abs(P.map.unproject(L.point(centerPx.x, centerPx.y + radiusPx), zoom).lat - center.lat));
                const cells = new Map();
                for (const ph of markerPhotos) {
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
                sparsePhotos = markerPhotos;
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
                if (loaderLabel) loaderLabel.textContent = `Placing ${done.toLocaleString(P.locale())} / ${total.toLocaleString(P.locale())}…`;
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
            if (data.total === 0) {
                P.mapPhotos.innerHTML = `<div class="map-strip-empty"><div class="map-strip-empty-icon"><i data-lucide="map-pin-off"></i></div><div class="map-strip-empty-title">${t("map.nothing_here")}</div><div class="map-strip-empty-hint">${t("map.nothing_here_hint")}</div></div>`;
            } else {
                mapSentinel = document.createElement("div");
                mapSentinel.className = "map-strip-sentinel";
                P.mapPhotos.appendChild(mapSentinel);
                if (mapStripObserver) mapStripObserver.observe(mapSentinel);
                fillMapStripViewport();
            }
            if (window.lucide) window.lucide.createIcons();
            P.fn.renderSelection();
            const countLabel = P.filterGeo.value === "0" ? "map.not_geo_tagged" : "map.geo_tagged";
            P.photoCountH.textContent = t(countLabel, { count: data.total.toLocaleString(P.locale()) });
            if (P.mapPhotoCount) P.mapPhotoCount.textContent = t("common.items", { count: data.total.toLocaleString(P.locale()) });
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
