import { api } from './api.js';

let map = null;
let clusterGroup = null;
let plainGroup = null;
let mapMoveTimeout = null;

export function initMapModule(context) {
    const {
        mapPhotos,
        photoCountH,
        openDetail,
        is360Photo,
        isVideo,
        getFilterValues,
        getActiveFolderId,
    } = context;

    function getFilterParams() {
        const filters = getFilterValues();
        const p = new URLSearchParams();
        const folderId = getActiveFolderId();
        if (folderId) p.set("folder_id", folderId);
        if (filters.q) p.set("q", filters.q);
        if (filters.camera) p.set("camera", filters.camera);
        if (filters.lens) p.set("lens", filters.lens);
        if (filters.ext) p.set("ext", filters.ext);
        if (filters.date_from) p.set("date_from", filters.date_from);
        if (filters.date_to) p.set("date_to", filters.date_to);
        if (filters.rating) p.set("rating", filters.rating);
        if (filters.is_360) p.set("is_360", filters.is_360);
        return p;
    }

    async function fitMapToFolder() {
        if (!map) return;
        const params = getFilterParams();
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
        const filters = getFilterValues();
        const folderId = getActiveFolderId();

        let url = `/api/photos/geo?south=${b.getSouth()}&west=${b.getWest()}&north=${b.getNorth()}&east=${b.getEast()}`;
        if (folderId) url += `&folder_id=${folderId}`;
        if (filters.country) url += `&country=${encodeURIComponent(filters.country)}`;
        if (filters.city) url += `&city=${encodeURIComponent(filters.city)}`;
        if (filters.camera) url += `&camera=${encodeURIComponent(filters.camera)}`;
        if (filters.lens) url += `&lens=${encodeURIComponent(filters.lens)}`;
        if (filters.ext) url += `&ext=${encodeURIComponent(filters.ext)}`;
        if (filters.date_from) url += `&date_from=${filters.date_from}`;
        if (filters.date_to) url += `&date_to=${filters.date_to}`;
        if (filters.rating) url += `&rating=${filters.rating}`;
        if (filters.is_360) url += `&is_360=${filters.is_360}`;
        if (filters.q) url += `&q=${encodeURIComponent(filters.q)}`;

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
            let badge = "";
            if (is360Photo(p)) {
                badge = `<div class="photo-360-badge" title="Photo 360°"><i data-lucide="compass"></i></div>`;
            } else if (isVideo(p)) {
                badge = `<div class="photo-video-badge" title="Video"><i data-lucide="play"></i></div>`;
            }
            card.innerHTML = `
                <img src="${p.thumb}" alt="${p.filename}" loading="lazy">
                ${badge}
            `;
            card.addEventListener("click", () => {
                openDetail(p.id);
            });
            mapPhotos.appendChild(card);
        }
        lucide.createIcons();
        photoCountH.textContent = `${data.total.toLocaleString()} geo-tagged`;
    }

    function invalidateSize() {
        if (map) map.invalidateSize();
    }

    function getMapInstance() {
        return map;
    }

    return {
        initMap,
        loadMapPhotos,
        fitMapToFolder,
        invalidateSize,
        getMapInstance
    };
}
