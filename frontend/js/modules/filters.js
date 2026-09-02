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
    
        function populateCheckList(listEl, items, proxy) {
            if (!listEl) return;
            const prev = proxy ? proxy.value : "";
            listEl.innerHTML = (items || []).map(item =>
                `<label class="filter-check filter-check-ext"><input type="checkbox" value="${item}"><span>${item}</span></label>`
            ).join("");
            if (proxy && prev) proxy.value = prev;
        }

        function populateCountryList(listEl, items, proxy) {
            if (!listEl) return;
            const prev = proxy ? proxy.value : "";
            listEl.innerHTML = (items || []).map(item =>
                `<label class="filter-check filter-check-ext filter-check-country"><input type="checkbox" value="${item}">${P.fn.countryFlag(item)}<span>${P.fn.getCountryName(item)}</span></label>`
            ).join("");
            if (proxy && prev) proxy.value = prev;
        }

        async function loadFilters() {
            const data = await P.fn.api("GET", "/api/filters");
            P.filterExtImageList = data.extensions_image || [];
            P.filterExtVideoList = data.extensions_video || [];
            populateCheckList(P.filterCameraList, data.cameras, P.filterCamera);
            populateCheckList(P.filterLensList, data.lenses, P.filterLens);
            populateFormatExt();
            populateCountryList(P.filterCountryList, data.countries, P.filterCountry);
            populateCheckList(P.filterCityList, data.cities, P.filterCity);
            if (P.filterCamera.value) {
                await refreshLenses();
            }
            if (P.filterCountry.value) {
                await refreshCities();
            }
            if (P.fn.updateFormatLabel) P.fn.updateFormatLabel();
            if (P.fn.updateDeviceLabel) P.fn.updateDeviceLabel();
            if (P.fn.updatePlaceLabel) P.fn.updatePlaceLabel();
        }

        function refreshLenses() {
            const params = new URLSearchParams();
            if (P.filterCamera.value) params.set("camera", P.filterCamera.value);
            return P.fn.api("GET", `/api/filters?${params.toString()}`).then(data => {
                populateCheckList(P.filterLensList, data.lenses || [], P.filterLens);
                if (P.fn.updateDeviceLabel) P.fn.updateDeviceLabel();
            });
        }

        function refreshCameras() {
            const params = new URLSearchParams();
            if (P.filterLens.value) params.set("lens", P.filterLens.value);
            return P.fn.api("GET", `/api/filters?${params.toString()}`).then(data => {
                populateCheckList(P.filterCameraList, data.cameras || [], P.filterCamera);
                if (P.fn.updateDeviceLabel) P.fn.updateDeviceLabel();
            });
        }

        function refreshCities() {
            const params = new URLSearchParams();
            if (P.filterCountry.value) params.set("country", P.filterCountry.value);
            return P.fn.api("GET", `/api/filters?${params.toString()}`).then(data => {
                populateCheckList(P.filterCityList, data.cities || [], P.filterCity);
                if (P.fn.updatePlaceLabel) P.fn.updatePlaceLabel();
            });
        }

        function activeExtList() {
            const img = P.filterTypeImage.checked;
            const vid = P.filterTypeVideo.checked;
            if (img && !vid) return P.filterExtImageList || [];
            if (vid && !img) return P.filterExtVideoList || [];
            return (P.filterExtImageList || []).concat(P.filterExtVideoList || []);
        }

        function populateFormatExt() {
            if (!P.filterExtList) return;
            const list = activeExtList().map(e => e.toLowerCase());
            const prev = P.filterExt.value;
            P.filterExtList.innerHTML = list.map(ext =>
                `<label class="filter-check filter-check-ext"><input type="checkbox" value="${ext}"><span>.${ext.replace(/^\./, "")}</span></label>`
            ).join("");
            if (prev) {
                const want = prev.split(",");
                P.filterExtList.querySelectorAll("input").forEach(cb => {
                    cb.checked = want.indexOf(cb.value) !== -1;
                });
            }
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
            if (P.filterExt.value) p.set("ext", P.filterExt.value);
            if (P.filterDateFrom.value) p.set("date_from", P.filterDateFrom.value);
            if (P.filterDateTo.value) p.set("date_to", P.filterDateTo.value);
            if (P.filterRating.value) p.set("rating", P.filterRating.value);
            if (P.activeTagId) p.set("tag_id", P.activeTagId);
            if (P.activeTagBrowseId) p.set("tag_id", P.activeTagBrowseId);
            if (P.activeCountryCode) {
                p.set("country", P.activeCountryCode);
            } else if (P.filterCountry.value) {
                p.set("country", P.filterCountry.value);
            }
            if (P.filterCity.value) p.set("city", P.filterCity.value);
            if (P.filterGeo.value) p.set("geo", P.filterGeo.value);
            if (P.filterTypeImage.checked && !P.filterTypeVideo.checked) p.set("type", "image");
            else if (P.filterTypeVideo.checked && !P.filterTypeImage.checked) p.set("type", "video");
            if (P.filter360.value) p.set("is_360", P.filter360.value === "yes" ? "1" : "0");
            if (P.hiddenFilter === "all") p.set("show_hidden", "1");
            else if (P.hiddenFilter === "only") p.set("hidden_only", "1");
            return p;
        }
    
    
    // --- exports ---
        P.fn.loadFilters = loadFilters;
        P.fn.getFilterParams = getFilterParams;
        P.fn.populateFormatExt = populateFormatExt;
        P.fn.refreshLenses = refreshLenses;
        P.fn.refreshCameras = refreshCameras;
        P.fn.populateCountryList = populateCountryList;
        P.fn.refreshCities = refreshCities;
})(window.PhotoApp = window.PhotoApp || {});
