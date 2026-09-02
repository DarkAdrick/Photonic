// Photonic module: events
(function (P) {
    const t = P.t;
        // ── Event listeners ───────────────────────────────────────────────────
    
        P.navItems.forEach(li => {
            li.addEventListener("click", () => P.fn.setView(li.dataset.view));
        });
        P.btnToggleFilters.addEventListener("click", () => {
            P.filterDrawer.classList.toggle("drawer-closed");
            P.btnToggleFilters.classList.toggle("active");
        });
        P.searchInput.addEventListener("input", P.fn.onSearch);
        P.filterDateFrom.addEventListener("change", P.fn.onFilterChange);
        P.filterDateTo.addEventListener("change", P.fn.onFilterChange);
        P.filterRating.addEventListener("change", P.fn.onFilterChange);
        P.filterGeo.addEventListener("change", P.fn.onFilterChange);
        P.filter360.addEventListener("change", P.fn.onFilterChange);
        [
            ["filter-camera-list", "updateDeviceLabel", "refreshLenses"],
            ["filter-lens-list", "updateDeviceLabel", null],
            ["filter-country-list", "updatePlaceLabel", "refreshCities"],
            ["filter-city-list", "updatePlaceLabel", null]
        ].forEach(([id, updaterName, refreshName]) => {
            const listEl = document.getElementById(id);
            if (!listEl) return;
            listEl.addEventListener("change", async (e) => {
                const list = e.target.closest("div");
                list.querySelectorAll("input[type=checkbox]").forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
                if (P.fn[updaterName]) P.fn[updaterName]();
                if (refreshName && P.fn[refreshName]) {
                    await P.fn[refreshName]();
                }
                P.fn.onFilterChange();
            });
        });
        [P.filterTypeImage, P.filterTypeVideo].forEach(cb => {
            cb.addEventListener("change", () => {
                if (P.fn.populateFormatExt) P.fn.populateFormatExt();
                P.fn.updateFormatLabel();
                P.fn.onFilterChange();
            });
        });
        function togglePopover(btn, pop) {
            const open = pop.classList.toggle("hidden");
            btn.classList.toggle("active", !open);
            if (!open) {
                document.querySelectorAll(".filter-format-btn.active").forEach(b => {
                    if (b !== btn) b.classList.remove("active");
                });
                document.querySelectorAll(".filter-popover:not(.hidden)").forEach(p => {
                    if (p !== pop) p.classList.add("hidden");
                });
                const r = btn.getBoundingClientRect();
                pop.style.left = Math.min(r.left, window.innerWidth - pop.offsetWidth - 8) + "px";
                pop.style.top = (r.bottom + 6) + "px";
            }
        }
        P.filterFormatBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePopover(P.filterFormatBtn, P.filterFormatPopover); });
        P.filterDeviceBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePopover(P.filterDeviceBtn, P.filterDevicePopover); });
        P.filterPlaceBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePopover(P.filterPlaceBtn, P.filterPlacePopover); });
        document.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-chip-format").forEach(chip => {
                if (!chip.contains(e.target)) {
                    const btn = chip.querySelector(".filter-format-btn");
                    const pop = chip.querySelector(".filter-popover");
                    if (btn && pop) {
                        pop.classList.add("hidden");
                        btn.classList.remove("active");
                    }
                }
            });
        });
        if (P.filterExtList) P.filterExtList.addEventListener("change", () => { P.fn.updateFormatLabel(); P.fn.onFilterChange(); });
        P.filterHidden.addEventListener("change", () => {
            P.hiddenFilter = P.filterHidden.value || "hide";
            if (P.activeView === "locations") P.lastMapQueryUrl = null;
            P.fn.onFilterChange();
        });
        P.btnClearFilters.addEventListener("click", P.fn.clearFilters);
        P.btnAddFolder.addEventListener("click", P.fn.openDialog);
        P.btnAddFolderSb.addEventListener("click", P.fn.openDialog);
        P.btnRescan.addEventListener("click", P.fn.rescanAll);
        if (P.btnScanCancel) P.btnScanCancel.addEventListener("click", async () => {
            P.btnScanCancel.classList.add("hidden");
            await P.fn.api("POST", "/api/scan/cancel");
        });
        P.btnOk.addEventListener("click", P.fn.addFolder);
        P.btnCancel.addEventListener("click", P.fn.closeDialog);
        document.getElementById("folder-dialog-close").addEventListener("click", P.fn.closeDialog);
        P.folderInput.addEventListener("keydown", (e) => { if (e.key === "Enter") P.fn.addFolder(); });
    
        P.tagDialogOk.addEventListener("click", P.fn.submitTagModal);
        P.tagDialogCancel.addEventListener("click", P.fn.closeTagModal);
        document.querySelectorAll("#tag-dialog-tabs .dialog-tab").forEach((btn) => {
            btn.addEventListener("click", () => P.fn.setTagTab(btn.dataset.tab));
        });
        document.getElementById("tag-dialog-close").addEventListener("click", P.fn.closeTagModal);
        P.tagInput.addEventListener("keydown", (e) => { if (e.key === "Enter") P.fn.submitTagModal(); });
        P.tagDialog.addEventListener("click", (e) => { if (e.target === P.tagDialog) P.fn.closeTagModal(); });
    
        P.cleaningTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                P.cleaningTabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                if (P.activeView === "cleaning") P.fn.loadCleaningTab();
            });
        });
        P.btnAnalyze.addEventListener("click", P.fn.startAnalysis);
    
        // ── Map resize handle ─────────────────────────────────────────────────
    
        (function() {
            let dragging = false, startY = 0, startTopH = 0, startBotH = 0;
            P.mapResize.addEventListener("mousedown", (e) => {
                e.preventDefault();
                dragging = true;
                startY = e.clientY;
                startTopH = P.mapView.offsetHeight;
                startBotH = P.mapPhotos.offsetHeight;
                document.body.style.cursor = "ns-resize";
                document.body.style.userSelect = "none";
            });
            document.addEventListener("mousemove", (e) => {
                if (!dragging) return;
                const delta = e.clientY - startY;
                const newTop = Math.max(100, startTopH + delta);
                const newBot = Math.max(60, startBotH - delta);
                P.mapView.style.flex = "none";
                P.mapView.style.height = newTop + "px";
                P.mapPhotos.style.height = newBot + "px";
                if (P.map) P.map.invalidateSize();
            });
            document.addEventListener("mouseup", () => {
                if (!dragging) return;
                dragging = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            });
        })();
    
        P.detailClose.addEventListener("click", P.fn.closeDetail);
        P.detail360Btn.addEventListener("click", P.fn.toggle360);
        P.detailFullscreenBtn.addEventListener("click", P.fn.toggleFullscreen);
        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement) {
                P.detailFullscreenBtn.innerHTML = '<i data-lucide="minimize"></i>';
                P.detailFullscreenBtn.title = "Exit fullscreen";
            } else {
                P.detailFullscreenBtn.innerHTML = '<i data-lucide="maximize"></i>';
                P.detailFullscreenBtn.title = "Fullscreen";
            }
            lucide.createIcons({ root: P.detailFullscreenBtn });
        });
    
        const detailMoreBtn = document.getElementById("detail-more");
        const detailMoreMenu = document.getElementById("detail-more-menu");
    
        function hideDetailMenu() {
            detailMoreMenu.classList.add("hidden");
        }
    
        detailMoreBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            detailMoreMenu.classList.toggle("hidden");
        });
    
        document.addEventListener("click", (e) => {
            if (!detailMoreMenu.classList.contains("hidden") && !e.target.closest(".detail-menu-wrap")) {
                hideDetailMenu();
            }
        });
    
        detailMoreMenu.addEventListener("click", async (e) => {
            const item = e.target.closest(".detail-menu-item");
            if (!item || !P.detailCurrentPhotoId) return;
            const action = item.dataset.action;
            hideDetailMenu();
            if (action === "open") {
                P.fn.api("POST", `/api/photos/${P.detailCurrentPhotoId}/open`);
            } else if (action === "reveal") {
                P.fn.api("POST", `/api/photos/${P.detailCurrentPhotoId}/reveal`);
            } else if (action === "copy-path") {
                if (P.detailCurrentPhotoData?.path) await navigator.clipboard.writeText(P.detailCurrentPhotoData.path);
            } else if (action === "delete") {
                const deleted = await P.fn.confirmDelete([P.detailCurrentPhotoId]);
                if (deleted) P.fn.closeDetail();
            }
        });
    
        P.detailPrev.addEventListener("click", () => P.fn.navigateDetail(-1));
        P.detailNext.addEventListener("click", () => P.fn.navigateDetail(1));
        P.detailRotateCW.addEventListener("click", async () => {
            if (!P.detailCurrentPhotoId) return;
            P.detailRotateCW.disabled = true;
            P.detailRotateCCW.disabled = true;
            const res = await P.fn.api("POST", `/api/photos/${P.detailCurrentPhotoId}/rotate`, { degrees: 90 });
            if (res.ok) {
                P.detailThumbVersion++;
                P.detailRotation = 0;
                P.fn.loadDetail(P.detailCurrentPhotoId);
                P.detailMeta.querySelectorAll(".meta-row").forEach(row => {
                    if (row.querySelector(".meta-label")?.textContent === t("detail.dimensions")) {
                        row.querySelector(".meta-value").textContent = `${res.width} × ${res.height}`;
                    }
                });
            }
            P.detailRotateCW.disabled = false;
            P.detailRotateCCW.disabled = false;
        });
        P.detailRotateCCW.addEventListener("click", async () => {
            if (!P.detailCurrentPhotoId) return;
            P.detailRotateCW.disabled = true;
            P.detailRotateCCW.disabled = true;
            const res = await P.fn.api("POST", `/api/photos/${P.detailCurrentPhotoId}/rotate`, { degrees: -90 });
            if (res.ok) {
                P.detailThumbVersion++;
                P.detailRotation = 0;
                P.fn.loadDetail(P.detailCurrentPhotoId);
                P.detailMeta.querySelectorAll(".meta-row").forEach(row => {
                    if (row.querySelector(".meta-label")?.textContent === t("detail.dimensions")) {
                        row.querySelector(".meta-value").textContent = `${res.width} × ${res.height}`;
                    }
                });
            }
            P.detailRotateCW.disabled = false;
            P.detailRotateCCW.disabled = false;
        });
    
        function applyDetailZoom() {
            const tx = `translate(${P.detailPanX}px, ${P.detailPanY}px)`;
            P.detailImg.style.transform = `rotate(${P.detailRotation}deg) scale(${P.detailZoom / 100}) ${tx}`;
            P.detailZoomLabel.textContent = P.detailZoom + "%";
            P.detailImg.classList.toggle("zoomed", P.detailZoom > 100);
        }
    
        function resetDetailZoom() {
            P.detailZoom = 100;
            P.detailPanX = 0;
            P.detailPanY = 0;
            P.detailZoomSlider.value = 100;
            applyDetailZoom();
        }
    
        P.detailZoomSlider.addEventListener("input", () => {
            P.detailZoom = parseInt(P.detailZoomSlider.value);
            if (P.detailZoom <= 100) { P.detailPanX = 0; P.detailPanY = 0; }
            applyDetailZoom();
        });
    
        P.detailStage.addEventListener("wheel", (e) => {
            if (P.detailOverlay.classList.contains("hidden")) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? 40 : -40;
            P.detailZoom = Math.max(100, Math.min(500, P.detailZoom + delta));
            P.detailZoomSlider.value = P.detailZoom;
            if (P.detailZoom <= 100) { P.detailPanX = 0; P.detailPanY = 0; }
            applyDetailZoom();
        }, { passive: false });
    
        P.detailImg.addEventListener("mousedown", (e) => {
            if (P.detailZoom <= 100) return;
            e.preventDefault();
            P.detailDragging = true;
            P.detailDragStartX = e.clientX - P.detailPanX;
            P.detailDragStartY = e.clientY - P.detailPanY;
        });
    
        document.addEventListener("mousemove", (e) => {
            if (!P.detailDragging) return;
            P.detailPanX = e.clientX - P.detailDragStartX;
            P.detailPanY = e.clientY - P.detailDragStartY;
            applyDetailZoom();
        });
    
        document.addEventListener("mouseup", () => { P.detailDragging = false; });
    
        P.detailOverlay.addEventListener("click", (e) => { if (e.target === P.detailOverlay) P.fn.closeDetail(); });
        function isEditable(el) {
            if (!el) return false;
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
            return el.isContentEditable;
        }
        const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
        document.addEventListener("keydown", (e) => {
            const typing = isEditable(e.target);
            if (typing) return;

            const dialogOpen = !P.detailOverlay.classList.contains("hidden")
                || !!document.querySelector(".dialog-overlay:not(.hidden)");

            if (!P.detailOverlay.classList.contains("hidden")) {
                if (scrollKeys.indexOf(e.key) !== -1) e.preventDefault();
                if (e.key === "Escape") P.fn.closeDetail();
                if (e.key === "ArrowLeft") P.fn.navigateDetail(-1);
                if (e.key === "ArrowRight") P.fn.navigateDetail(1);
                if ((e.key === "h" || e.key === "H") && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    if (P.detailCurrentPhotoId != null) {
                        P.fn.hidePhotos([P.detailCurrentPhotoId], !P.fn.isPhotoHidden(P.detailCurrentPhotoData));
                        P.fn.closeDetail();
                    }
                }
            } else if (dialogOpen && scrollKeys.indexOf(e.key) !== -1) {
                e.preventDefault();
            } else if (e.key === "Escape") {
                if (P.selectedIds.size > 0) P.fn.deselectAll();
                P.fn.hideContextMenu();
            } else if (e.ctrlKey && e.key === "a") {
                const usesGrid = P.activeView === "library" || P.activeView === "cleaning" || P.activeView === "folders" || P.activeView === "collections" || (P.activeView === "countries" && P.activeCountryCode) || (P.activeView === "tags" && P.activeTagBrowseId) || (P.activeView === "cameras" && P.activeCameraBrowseId);
                const usesMap = P.activeView === "locations";
                if ((usesGrid && !P.photoGrid.classList.contains("hidden")) || usesMap) {
                    e.preventDefault();
                    for (const c of P.fn.getVisiblePhotoCards()) P.selectedIds.add(parseInt(c.dataset.photoId));
                    P.fn.renderSelection();
                }
            } else if ((e.key === "h" || e.key === "H") && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (P.selectedIds.size > 0) {
                    const ids = Array.from(P.selectedIds);
                    P.fn.hidePhotos(ids, P.fn.getSelectionHiddenInfo(ids).shown > 0);
                }
            }
        });
    
    
    function updateFormatLabel() {
        const img = P.filterTypeImage.checked;
        const vid = P.filterTypeVideo.checked;
        if (img && vid) { P.filterFormatLabel.textContent = t("filter.images") + " + " + t("filter.videos"); P.filterFormatLabel.classList.add("active"); return; }
        if (img) { P.filterFormatLabel.textContent = t("filter.images"); P.filterFormatLabel.classList.add("active"); return; }
        if (vid) { P.filterFormatLabel.textContent = t("filter.videos"); P.filterFormatLabel.classList.add("active"); return; }
        const extVal = P.filterExt.value;
        if (extVal) {
            const exts = extVal.split(",");
            P.filterFormatLabel.textContent = exts.length > 1 ? `${exts[0]} +${exts.length - 1}` : exts[0];
            P.filterFormatLabel.classList.add("active");
            return;
        }
        P.filterFormatLabel.textContent = t("filter.all");
        P.filterFormatLabel.classList.remove("active");
    }

    function updateDeviceLabel() {
        const cam = P.filterCamera.value;
        const lens = P.filterLens.value;
        if (cam || lens) {
            P.filterDeviceLabel.textContent = cam ? cam : lens;
            P.filterDeviceLabel.classList.add("active");
        } else {
            P.filterDeviceLabel.textContent = t("filter.all");
            P.filterDeviceLabel.classList.remove("active");
        }
    }

    function updatePlaceLabel() {
        const country = P.filterCountry.value;
        const city = P.filterCity.value;
        if (country || city) {
            P.filterPlaceLabel.textContent = country ? P.fn.getCountryName(country) : city;
            P.filterPlaceLabel.classList.add("active");
        } else {
            P.filterPlaceLabel.textContent = t("filter.all");
            P.filterPlaceLabel.classList.remove("active");
        }
    }

    // --- exports ---
        P.fn.hideDetailMenu = hideDetailMenu;
        P.fn.applyDetailZoom = applyDetailZoom;
        P.fn.resetDetailZoom = resetDetailZoom;
        P.fn.updateFormatLabel = updateFormatLabel;
        P.fn.updateDeviceLabel = updateDeviceLabel;
        P.fn.updatePlaceLabel = updatePlaceLabel;
})(window.PhotoApp = window.PhotoApp || {});
