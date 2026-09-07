// Photonic module: tile_providers
// Centralizes the available map base layers and exposes helpers to build a
// Leaflet tile layer for the currently selected provider.
(function (P) {
    const t = P.t;
    const CARTO_KEY = "cb1_2zxn_1_99897738beaf108b0e4a9327";
    const STORAGE_KEY = "photonic.tileProvider";

    P.TILE_PROVIDERS = {
        osm: {
            name: "OpenStreetMap",
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
            maxZoom: 19,
            bg: "#F0F0F0",
        },
        topo: {
            name: "Topo (OpenStreetMap)",
            url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
            attribution: "&copy; <a href=\"https://opentopomap.org\">OpenTopoMap</a> &copy; <a href=\"https://www.openstreetmap.org/copyright\">OSM</a>",
            maxZoom: 17,
            bg: "#EFEFEF",
        },
        voyager: {
            name: "Voyager (Carto)",
            url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
            attribution: "&copy; <a href=\"https://carto.com/\">CARTO</a> &copy; <a href=\"https://www.openstreetmap.org/copyright\">OSM</a>",
            maxZoom: 20,
            bg: "#F8F4F0",
        },
        positron: {
            name: "Light (Carto)",
            url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
            attribution: "&copy; <a href=\"https://carto.com/\">CARTO</a> &copy; <a href=\"https://www.openstreetmap.org/copyright\">OSM</a>",
            maxZoom: 20,
            bg: "#EDEBE9",
        },
        dark: {
            name: "Dark (Carto)",
            url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
            attribution: "&copy; <a href=\"https://carto.com/\">CARTO</a> &copy; <a href=\"https://www.openstreetmap.org/copyright\">OSM</a>",
            maxZoom: 20,
            bg: "#151515",
        },
        esri_world: {
            name: "World Imagery (Esri)",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: "&copy; Esri, Maxar, Earthstar Geographics",
            maxZoom: 19,
            bg: "#0E2E47",
        },
    };

    P.fn.getTileProviderId = function () {
        const id = localStorage.getItem(STORAGE_KEY);
        return P.TILE_PROVIDERS[id] ? id : "osm";
    };

    P.fn.setTileProviderId = function (id) {
        if (!P.TILE_PROVIDERS[id]) return false;
        localStorage.setItem(STORAGE_KEY, id);
        return true;
    };

    P.fn.getTileProvider = function () {
        return P.TILE_PROVIDERS[P.fn.getTileProviderId()];
    };

    P.fn.buildTileLayer = function (opts) {
        const provider = P.fn.getTileProvider();
        const maxNativeZoom = provider.maxZoom || 19;
        return L.tileLayer(provider.url, {
            attribution: provider.attribution,
            maxZoom: 20,
            maxNativeZoom: maxNativeZoom,
            ...(opts || {}),
        });
    };

    // Tint the map container with the base layer's background color. During
    // fractional zoom / pan the browser puts each tile at a sub-pixel position,
    // and the anti-aliased halves of two neighbouring tiles don't add up to full
    // coverage: the seam shows whatever sits underneath. Matching the container
    // color to the tiles makes that residual line visually disappear (it is
    // especially visible on dark base layers with a light background).
    P.fn.applyMapTileBackground = function (map) {
        if (!map || !map.getContainer) return;
        map.getContainer().style.background = P.fn.getTileProvider().bg || "var(--bg-secondary)";
    };

    // Swap the base layer of a Leaflet map to the currently selected provider.
    // `target` may be a Leaflet map or an object like { map, layer }. Any
    // existing tile layer on the map is removed first, then the new layer is
    // added and returned (also assigned to target.layer when provided).
    P.fn.applyTileProvider = function (target) {
        const map = target && target.map ? target.map : target;
        if (!map) return null;
        const toRemove = [];
        map.eachLayer(l => { if (l instanceof L.TileLayer) toRemove.push(l); });
        toRemove.forEach(l => map.removeLayer(l));
        const layer = P.fn.buildTileLayer();
        layer.addTo(map);
        P.fn.applyMapTileBackground(map);
        if (target) target.layer = layer;
        return layer;
    };

    // ── Map control: on-map tile provider picker ─────────────────────────────

    P.TileControl = L.Control.extend({
        options: { position: "topright" },

        onAdd(map) {
            this._map = map;
            const container = L.DomUtil.create("div", "leaflet-bar leaflet-tile-switch");
            const btn = L.DomUtil.create("a", "leaflet-tile-switch-btn", container);
            btn.href = "#";
            btn.title = t("map.tile_provider");
            btn.innerHTML = `<i data-lucide="layers"></i>`;
            this._menu = L.DomUtil.create("div", "leaflet-tile-switch-menu hidden", container);

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            btn.addEventListener("click", (e) => {
                L.DomEvent.stop(e);
                e.preventDefault();
                const willOpen = this._menu.classList.contains("hidden");
                this.close();
                if (willOpen) {
                    this.render();
                    this._menu.classList.remove("hidden");
                }
            });
            document.addEventListener("click", () => this.close());
            this.render();
            if (window.lucide) window.lucide.createIcons({ root: container });
            return container;
        },

        render() {
            if (!this._menu) return;
            this._menu.innerHTML = Object.entries(P.TILE_PROVIDERS).map(([id, p]) => {
                const current = P.fn.getTileProviderId() === id;
                return `<div class="leaflet-tile-switch-item${current ? " active" : ""}" data-provider="${id}">
                    ${current ? "<i data-lucide=\"check\"></i>" : "<i class=\"leaflet-tile-switch-dot\"></i>"}
                    <span>${p.name}</span>
                </div>`;
            }).join("");
            this._menu.querySelectorAll(".leaflet-tile-switch-item").forEach(item => {
                item.addEventListener("click", () => {
                    const id = item.dataset.provider;
                    if (!P.fn.setTileProviderId(id)) return;
                    this._layer = P.fn.applyTileProvider(this._map);
                    this.render();
                    this.close();
                });
            });
            if (window.lucide) window.lucide.createIcons({ root: this._menu });
        },

        close() {
            if (this._menu) this._menu.classList.add("hidden");
        },
    });

    // Attach the tile picker control to a Leaflet map. Replaces any existing
    // instance so each map holds at most one control.
    P.fn.addTileControl = function (map) {
        if (!map || !window.L || !P.TileControl) return null;
        if (map._tileProviderControl) map.removeControl(map._tileProviderControl);
        const ctrl = new P.TileControl().addTo(map);
        ctrl._layer = P.tileLayer || P.fn.buildTileLayer();
        map._tileProviderControl = ctrl;
        return ctrl;
    };
})(window.PhotoApp = window.PhotoApp || {});
