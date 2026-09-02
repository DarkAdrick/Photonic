// Photonic module: geotag_modal
// Lets the user assign a GPS location to one or several photos through a map
// dialog, then writes it into the Exif data of the files.
(function (P) {
    const t = P.t;

    const dialog      = document.getElementById("geotag-dialog");
    const closeBtn    = document.getElementById("geotag-dialog-close");
    const cancelBtn   = document.getElementById("geotag-dialog-cancel");
    const okBtn       = document.getElementById("geotag-dialog-ok");
    const removeBtn   = document.getElementById("geotag-remove");
    const searchInput = document.getElementById("geotag-search-input");
    const searchResults = document.getElementById("geotag-search-results");
    const mapEl       = document.getElementById("geotag-map");
    const coordsEl    = document.getElementById("geotag-coords");
    const confirmBar  = document.getElementById("geotag-confirm");
    const confirmBack = document.getElementById("geotag-confirm-back");
    const confirmOk   = document.getElementById("geotag-confirm-ok");
    const confirmText = document.getElementById("geotag-confirm-text");

    let geotagIds = [];
    let geotagMap = null;
    let geotagMarker = null;
    let geotagOriginalLat = null;
    let geotagOriginalLng = null;
    let geotagHasLocation = false;
    let geotagSearchTimer = null;
    let geotagPointPlaced = false;

    function fmtCoord(v) {
        if (v == null || isNaN(v)) return "—";
        return v.toFixed(6);
    }

    function renderCoords() {
        const hasPoint = geotagMarker != null;
        const lat = hasPoint ? geotagMarker.getLatLng().lat : null;
        const lng = hasPoint ? geotagMarker.getLatLng().lng : null;
        if (!hasPoint) {
            coordsEl.textContent = t("geotag.placeholder");
            return;
        }
        const dirLat = lat >= 0 ? "N" : "S";
        const dirLng = lng >= 0 ? "E" : "W";
        coordsEl.textContent = `${Math.abs(lat).toFixed(5)}° ${dirLat}, ${Math.abs(lng).toFixed(5)}° ${dirLng}`;
    }

    function setMarker(latlng, { fly = false } = {}) {
        if (latlng == null) return;
        if (!geotagMap) return;
        if (geotagMarker) {
            geotagMarker.setLatLng(latlng);
        } else {
            geotagMarker = L.marker(latlng, { draggable: true });
            geotagMarker.addTo(geotagMap);
            geotagMarker.on("dragend", renderCoords);
        }
        geotagPointPlaced = true;
        if (fly) geotagMap.flyTo(latlng, Math.max(geotagMap.getZoom(), 10), { duration: 0.6 });
        else geotagMap.panTo(latlng);
        renderCoords();
    }

    function ensureMap() {
        if (geotagMap) {
            geotagMap.invalidateSize();
            return;
        }
        geotagMap = L.map(mapEl, {
            noWrap: true,
            worldCopyJump: false,
            minZoom: 2,
            maxBounds: [[-89, -180], [89, 180]],
            maxBoundsViscosity: 1.0,
        }).setView([46.6, 2.3], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
            maxZoom: 20,
        }).addTo(geotagMap);
        geotagMap.on("click", (e) => setMarker(e.latlng));
        setTimeout(() => geotagMap.invalidateSize(), 60);
    }

    function clearSearchResults() {
        searchResults.classList.add("hidden");
        searchResults.innerHTML = "";
    }

    async function runSearch(query) {
        const q = query.trim();
        if (!q) { clearSearchResults(); return; }
        searchResults.innerHTML = `<div class="geotag-search-result empty">${t("geotag.locating")}</div>`;
        searchResults.classList.remove("hidden");
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}`
                + (P.locale() ? `&accept-language=${encodeURIComponent(P.locale())}` : "");
            const res = await fetch(url);
            if (!res.ok) throw new Error("nominatim");
            const data = await res.json();
            if (searchInput.value.trim() !== q) return;
            if (!data || data.length === 0) {
                searchResults.innerHTML = `<div class="geotag-search-result empty">${t("geotag.no_results")}</div>`;
                return;
            }
            searchResults.innerHTML = "";
            for (const item of data) {
                const el = document.createElement("div");
                el.className = "geotag-search-result";
                el.textContent = item.display_name;
                el.addEventListener("click", () => {
                    const latlng = L.latLng(parseFloat(item.lat), parseFloat(item.lon));
                    setMarker(latlng, { fly: true });
                    clearSearchResults();
                });
                searchResults.appendChild(el);
            }
        } catch (err) {
            searchResults.innerHTML = `<div class="geotag-search-result empty">${t("geotag.search_error")}</div>`;
        }
    }

    function onSearchInput() {
        clearTimeout(geotagSearchTimer);
        const q = searchInput.value.trim();
        if (!q) { clearSearchResults(); return; }
        geotagSearchTimer = setTimeout(() => runSearch(q), 300);
    }

    async function openGeotagModal(photoIds, presetCoords) {
        if (!Array.isArray(photoIds) || photoIds.length === 0) return;
        geotagIds = photoIds;
        geotagMarker = null;
        geotagOriginalLat = null;
        geotagOriginalLng = null;
        geotagHasLocation = false;
        geotagPointPlaced = false;
        searchInput.value = "";
        clearSearchResults();
        confirmBar.classList.add("hidden");
        dialog.classList.remove("hidden");
        const countEl = document.getElementById("geotag-dialog-count");
        if (countEl) countEl.textContent = t("geotag.count", { count: photoIds.length.toLocaleString(P.locale()) });

        ensureMap();
        geotagMap.setView([46.6, 2.3], 5);
        setTimeout(() => geotagMap.invalidateSize(), 60);

        if (presetCoords && isFinite(presetCoords.lat) && isFinite(presetCoords.lng)) {
            setMarker(L.latLng(presetCoords.lat, presetCoords.lng), { fly: true });
        } else if (photoIds.length === 1) {
            const data = await P.fn.api("GET", `/api/photos/${photoIds[0]}`);
            if (data && isFinite(data.latitude) && isFinite(data.longitude)) {
                geotagOriginalLat = data.latitude;
                geotagOriginalLng = data.longitude;
                geotagHasLocation = true;
                setMarker(L.latLng(data.latitude, data.longitude), { fly: true });
            }
        } else {
            const ids = photoIds.join(",");
            const st = await P.fn.api("GET", `/api/photos/location-status?ids=${encodeURIComponent(ids)}`);
            geotagHasLocation = !!(st && st.has_location);
        }
        lucide.createIcons();
        renderCoords();
    }

    function closeGeotagModal() {
        dialog.classList.add("hidden");
        clearSearchResults();
        confirmBar.classList.add("hidden");
        if (geotagMarker) {
            geotagMap.removeLayer(geotagMarker);
            geotagMarker = null;
        }
    }

    async function executeSave(lat, lng) {
        const res = await P.fn.api("POST", "/api/photos/set-location", {
            photo_ids: geotagIds,
            latitude: lat,
            longitude: lng,
        });
        closeGeotagModal();
        if (res && res.error) {
            P.fn.showToast(res.error, { icon: "x" });
            return;
        }
        P.lastMapQueryUrl = null;
        if (P.activeView === "locations") P.fn.loadMapPhotos();
        P.fn.renderSelection();
        if (res && res.updated > 0) {
            const written = res.file_written || 0;
            const msg = written === res.updated
                ? t("geotag.saved", { count: res.updated })
                : t("geotag.saved_library", { count: res.updated, written });
            P.fn.showToast(msg, { icon: "check" });
        }
    }

    async function onSave() {
        if (!geotagMarker || !geotagPointPlaced) return;
        const ll = geotagMarker.getLatLng();
        const lat = ll.lat;
        const lng = ll.lng;

        const unchanged = geotagOriginalLat != null && geotagOriginalLng != null
            && Math.abs(geotagOriginalLat - lat) < 1e-9 && Math.abs(geotagOriginalLng - lng) < 1e-9;
        const needsConfirm = geotagHasLocation && !unchanged
            && localStorage.getItem("photonic.confirmGeotagOverwrite") !== "false";

        if (needsConfirm) {
            confirmText.textContent = geotagIds.length > 1
                ? t("geotag.overwrite_msg_multi", { count: geotagIds.length })
                : t("geotag.overwrite_msg");
            confirmBar.classList.remove("hidden");
            confirmOk.onclick = async () => {
                confirmBar.classList.add("hidden");
                await executeSave(lat, lng);
            };
            confirmBack.onclick = () => confirmBar.classList.add("hidden");
            return;
        }
        await executeSave(lat, lng);
    }

    async function onRemove() {
        confirmBar.classList.add("hidden");
        await executeSave(null, null);
    }

    closeBtn.addEventListener("click", closeGeotagModal);
    cancelBtn.addEventListener("click", closeGeotagModal);
    okBtn.addEventListener("click", onSave);
    removeBtn.addEventListener("click", onRemove);
    searchInput.addEventListener("input", onSearchInput);
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            clearTimeout(geotagSearchTimer);
            runSearch(searchInput.value);
        }
    });
    dialog.addEventListener("click", (e) => {
        if (e.target === dialog) closeGeotagModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !dialog.classList.contains("hidden")) closeGeotagModal();
    });

    // --- exports ---
    P.fn.openGeotagModal = openGeotagModal;
    P.fn.closeGeotagModal = closeGeotagModal;
})(window.PhotoApp = window.PhotoApp || {});