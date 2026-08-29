// Photonic module: filters
(function (P) {
    const t = P.t;
        // ── Filters ───────────────────────────────────────────────────────────
    
        function populateSelect(el, items, placeholder, format) {
            const prev = el.value;
            el.innerHTML = `<option value="">${placeholder}</option>`;
            for (const item of items) {
                const val = format ? format(item) : item;
                el.innerHTML += `<option value="${val}">${val}</option>`;
            }
            if (prev) el.value = prev;
        }
    
        async function loadFilters() {
            const data = await P.fn.api("GET", "/api/filters");
            populateSelect(P.filterCamera, data.cameras, t("filter.all"));
            populateSelect(P.filterLens, data.lenses, t("filter.all"));
            populateSelect(P.filterExt, data.extensions, t("filter.all"), e => `.${e}`);
            populateSelect(P.filterCountry, data.countries, t("filter.all_countries"));
            populateSelect(P.filterCity, data.cities, t("filter.all_cities"));
        }
    
        function getFilterParams() {
            const p = new URLSearchParams();
            if (P.activeFolderId !== null) p.set("folder_id", P.activeFolderId);
            if (P.activeCollectionId !== null) p.set("collection_id", P.activeCollectionId);
            const q = P.searchInput.value.trim();
            if (q) p.set("q", q);
            if (P.activeCameraBrowseId) {
                p.set("camera", P.activeCameraBrowseId);
            } else if (P.filterCamera.value) {
                p.set("camera", P.filterCamera.value);
            }
            if (P.filterLens.value) p.set("lens", P.filterLens.value);
            if (P.filterExt.value) p.set("ext", P.filterExt.value.replace(/^\./, ""));
            if (P.filterDateFrom.value) p.set("date_from", P.filterDateFrom.value);
            if (P.filterDateTo.value) p.set("date_to", P.filterDateTo.value);
            if (P.filterRating.value) p.set("rating", P.filterRating.value);
            if (P.activeTagId) p.set("tag_id", P.activeTagId);
            if (P.activeCountryCode) {
                p.set("country", P.activeCountryCode);
            } else if (P.filterCountry.value) {
                p.set("country", P.filterCountry.value);
            }
            if (P.filterCity.value) p.set("city", P.filterCity.value);
            if (P.filterGeo.value) p.set("geo", P.filterGeo.value);
            if (P.filter360.value) p.set("is_360", P.filter360.value === "yes" ? "1" : "0");
            return p;
        }
    
    
    // --- exports ---
        P.fn.loadFilters = loadFilters;
        P.fn.getFilterParams = getFilterParams;
})(window.PhotoApp = window.PhotoApp || {});
