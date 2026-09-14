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
            let dragging = false, startY = 0, startTopH = 0, startBotH = 0, startHeaderH = 0, containerH = 0, containerW = 0, horiz = false, startX = 0, startMapW = 0;
            const mapContainer = document.getElementById("main");
            function startDrag(x, y) {
                dragging = true;
                horiz = P.locationsLayout.classList.contains("horizontal");
                containerH = mapContainer.clientHeight;
                containerW = mapContainer.clientWidth;
                if (horiz) {
                    startX = x;
                    startMapW = P.mapView.offsetWidth;
                } else {
                    startY = y;
                    startTopH = P.mapView.offsetHeight;
                    startBotH = P.mapPhotos.offsetHeight;
                    startHeaderH = P.mapPhotosHeader.offsetHeight;
                }
                document.body.style.cursor = horiz ? "col-resize" : "ns-resize";
                document.body.style.userSelect = "none";
            }
            function dragTo(x, y) {
                if (!dragging) return;
                if (horiz) {
                    const delta = x - startX;
                    const newMapW = Math.min(Math.max(200, startMapW + delta), Math.max(200, containerW - 5 - 130));
                    const newPanelW = Math.max(130, containerW - newMapW - 5);
                    P.locationsLayout.style.gridTemplateColumns = newMapW + "px 5px " + newPanelW + "px";
                    if (P.map) P.map.invalidateSize();
                    return;
                }
                const delta = y - startY;
                const maxTop = containerH - 5 - startHeaderH - 130;
                const newTop = Math.min(Math.max(100, startTopH + delta), Math.max(100, maxTop));
                const newBot = containerH - newTop - 5 - startHeaderH;
                P.mapView.style.flex = "none";
                P.mapView.style.height = newTop + "px";
                P.mapPhotos.style.height = newBot + "px";
                if (P.map) P.map.invalidateSize();
            }
            function endDrag() {
                if (!dragging) return;
                dragging = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
            P.mapResize.addEventListener("mousedown", (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
            document.addEventListener("mousemove", (e) => { if (dragging) dragTo(e.clientX, e.clientY); });
            document.addEventListener("mouseup", endDrag);
            P.mapResize.addEventListener("touchstart", (e) => {
                if (e.touches.length !== 1) return;
                e.preventDefault();
                const t = e.touches[0];
                startDrag(t.clientX, t.clientY);
            }, { passive: false });
            document.addEventListener("touchmove", (e) => {
                if (!dragging || e.touches.length !== 1) return;
                e.preventDefault();
                const t = e.touches[0];
                dragTo(t.clientX, t.clientY);
            }, { passive: false });
            document.addEventListener("touchend", endDrag);
            document.addEventListener("touchcancel", endDrag);
        })();

        // ── Detail resize handle (mobile) ──────────────────────────────────

        (function () {
            const GAP = 5, MIN_MAIN = 200, MIN_SIDE = 130;
            const el = P.detailResize, layout = P.detailLayout,
                  image = P.detailImage, sidebar = P.detailSidebar;
            if (!el || !layout) return;
            const KEY = "photonic.detailResize";
            let dragging = false, vert = true, startX = 0, startY = 0, startSide = 0, containerW = 0, containerH = 0;

            function isColumn() {
                try { return getComputedStyle(layout).flexDirection === "column"; }
                catch (e) { return false; }
            }
            function isMobile() {
                return (window.Photonic && window.Photonic.isNative && window.Photonic.isNative()) ||
                       window.matchMedia("(max-width: 768px)").matches;
            }
            function loadSaved() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
            function saveSaved(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

            function clearSizes() {
                image.style.removeProperty("flex");
                image.style.removeProperty("width");
                image.style.removeProperty("height");
                sidebar.style.removeProperty("flex");
                sidebar.style.removeProperty("width");
                sidebar.style.removeProperty("height");
                sidebar.style.removeProperty("min-width");
                sidebar.style.removeProperty("max-width");
                sidebar.style.removeProperty("max-height");
            }

            function applySizes(side, main) {
                if (vert) {
                    image.style.flex = "0 0 " + main + "px";
                    sidebar.style.flex = "0 0 " + side + "px";
                    sidebar.style.minWidth = side + "px";
                    sidebar.style.maxWidth = side + "px";
                } else {
                    image.style.flex = "0 0 auto";
                    image.style.height = main + "px";
                    sidebar.style.flex = "0 0 auto";
                    sidebar.style.height = side + "px";
                    sidebar.style.maxHeight = side + "px";
                }
            }

            function applyDetailResize() {
                clearSizes();
                const mobile = isMobile();
                if (!mobile) { el.style.display = "none"; return; }
                const visible = !P.detailOverlay.classList.contains("hidden");
                el.style.display = visible ? "" : "none";
                vert = !isColumn();
                el.classList.toggle("detail-resize-v", vert);
                if (!visible) return;
                containerW = layout.clientWidth;
                containerH = layout.clientHeight;
                const saved = loadSaved();
                if (vert && saved.lan) {
                    const w = Math.min(Math.max(MIN_SIDE, saved.lan), Math.max(MIN_SIDE, containerW - GAP - MIN_MAIN));
                    applySizes(w, containerW - GAP - w);
                } else if (!vert && saved.por) {
                    const h = Math.min(Math.max(MIN_SIDE, saved.por), Math.max(MIN_SIDE, containerH - GAP - MIN_MAIN));
                    applySizes(h, containerH - GAP - h);
                }
            }

            function startDrag(ev) {
                dragging = true;
                vert = !isColumn();
                containerW = layout.clientWidth;
                containerH = layout.clientHeight;
                if (vert) { startSide = sidebar.offsetWidth || 340; startX = ev.clientX; }
                else { startSide = sidebar.offsetHeight; startY = ev.clientY; }
                if (ev.cancelable) ev.preventDefault();
                document.body.style.cursor = vert ? "col-resize" : "ns-resize";
                document.body.style.userSelect = "none";
            }

            function dragTo(x, y) {
                if (!dragging) return;
                if (vert) {
                    const w = Math.min(Math.max(MIN_SIDE, startSide + (startX - x)), Math.max(MIN_SIDE, containerW - GAP - MIN_MAIN));
                    applySizes(w, containerW - GAP - w);
                } else {
                    const h = Math.min(Math.max(MIN_SIDE, startSide + (startY - y)), Math.max(MIN_SIDE, containerH - GAP - MIN_MAIN));
                    applySizes(h, containerH - GAP - h);
                }
            }

            function endDrag() {
                if (!dragging) return;
                dragging = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
                const s = loadSaved();
                if (vert) s.lan = sidebar.offsetWidth;
                else s.por = sidebar.offsetHeight;
                saveSaved(s);
                if (P.fn.applyDetailZoom) P.fn.applyDetailZoom();
            }

            P.fn.applyDetailResize = applyDetailResize;
            el.addEventListener("mousedown", (e) => { e.preventDefault(); startDrag(e); });
            document.addEventListener("mousemove", (e) => { if (dragging) dragTo(e.clientX, e.clientY); });
            document.addEventListener("mouseup", endDrag);
            el.addEventListener("touchstart", (e) => {
                if (e.touches.length !== 1) return;
                e.preventDefault();
                const t = e.touches[0];
                startDrag({ clientX: t.clientX, clientY: t.clientY, cancelable: false });
            }, { passive: false });
            document.addEventListener("touchmove", (e) => {
                if (!dragging || e.touches.length !== 1) return;
                e.preventDefault();
                const t = e.touches[0];
                dragTo(t.clientX, t.clientY);
            }, { passive: false });
            document.addEventListener("touchend", endDrag);
            document.addEventListener("touchcancel", endDrag);
            window.addEventListener("resize", () => { if (!P.detailOverlay.classList.contains("hidden")) applyDetailResize(); });
            if (!P.detailOverlay.classList.contains("hidden")) applyDetailResize();
        })();
    
        P.detailClose.addEventListener("click", P.fn.closeDetail);
        P.detail360Btn.addEventListener("click", P.fn.toggle360);
        P.detailFullscreenBtn.addEventListener("click", P.fn.toggleFullscreen);
        document.addEventListener("fullscreenchange", () => {
            if (typeof P.fn.setDetailFullscreenIcon === "function") {
                P.fn.setDetailFullscreenIcon(!!document.fullscreenElement);
            }
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
            if (action === "open" || action === "reveal") {
                const isNative = P.fn.isNative && P.fn.isNative();
                const plugin = isNative && window.Photonic ? window.Photonic.nativePlugin() : null;
                const data = P.detailCurrentPhotoData;
                if (plugin && data && data.path) {
                    const method = action === "open" ? "openMedia" : "revealMedia";
                    if (typeof plugin[method] === "function") {
                        const params = { uri: data.path, mime: data.mime_type || "" };
                        if (action === "reveal") params.folder = data.folder || "";
                        plugin[method](params).catch((err) => {
                            P.fn.showToast(String((err && (err.message || err)) || err), { icon: "x" });
                        });
                    }
                } else if (action === "open") {
                    P.fn.api("POST", `/api/photos/${P.detailCurrentPhotoId}/open`);
                } else {
                    P.fn.api("POST", `/api/photos/${P.detailCurrentPhotoId}/reveal`);
                }
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
            // translate must come before scale so the pan values map to 1:1 screen
            // pixels. (translate applied after scale is in the element's local
            // space and gets multiplied by the zoom factor → too fast.)
            P.detailImg.style.transform = `translate(${P.detailPanX}px, ${P.detailPanY}px) scale(${P.detailZoom / 100}) rotate(${P.detailRotation}deg)`;
            P.detailZoomLabel.textContent = P.detailZoom + "%";
            P.detailImg.classList.toggle("zoomed", P.detailZoom > 100);
            // On mobile the zoomed image covers the whole frame (and swipes are
            // used to pan): hide the prev/next arrows as soon as we zoom in.
            const hideNav = P.detailZoom > 100 && detailMobile();
            P.detailPrev.classList.toggle("hidden", hideNav);
            P.detailNext.classList.toggle("hidden", hideNav);
        }

        function detailMobile() {
            return (P.fn.isNative && P.fn.isNative()) ||
                (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
        }

        // Double-tap zoom (mobile only): 100% ↔ 250%. Uses the tap position as
        // the zoom anchor when zooming in.
        function toggleDetailDoubleTapZoom(x, y) {
            if (P.detailZoom <= 100) {
                P.detailZoom = 250;
            } else {
                P.detailZoom = 100;
                P.detailPanX = 0;
                P.detailPanY = 0;
            }
            P.detailZoomSlider.value = P.detailZoom;
            applyDetailZoom();
        }

        // Single vs double tap on the detail stage (mobile). A single tap exits
        // the CSS fullscreen; a double tap toggles the zoom. Detection runs on
        // touch events: when zoomed, touchstart preventDefaults and the
        // synthesized click never fires, so a click-based detector is dead.
        let detailLastTapTime = 0;
        let detailLastTapX = 0;
        let detailLastTapY = 0;
        let detailTapTimer = null;
        function registerDetailTap(x, y) {
            if (!detailMobile()) return;
            const now = Date.now();
            const isDouble = (now - detailLastTapTime) < 320 &&
                Math.abs(x - detailLastTapX) < 36 && Math.abs(y - detailLastTapY) < 36;
            detailLastTapTime = now;
            detailLastTapX = x;
            detailLastTapY = y;
            if (detailTapTimer) clearTimeout(detailTapTimer);
            detailTapTimer = null;
            if (isDouble) {
                toggleDetailDoubleTapZoom(x, y);
                return;
            }
            detailTapTimer = setTimeout(() => {
                if (document.body.classList.contains("photonic-detail-fs")) {
                    document.body.classList.remove("photonic-detail-fs");
                    if (typeof P.fn.setDetailFullscreenIcon === "function") P.fn.setDetailFullscreenIcon(false);
                }
            }, 320);
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

        function stepDetailZoom(delta) {
            P.detailZoom = Math.max(100, Math.min(500, P.detailZoom + delta));
            P.detailZoomSlider.value = P.detailZoom;
            if (P.detailZoom <= 100) { P.detailPanX = 0; P.detailPanY = 0; }
            applyDetailZoom();
        }
        document.getElementById("detail-zoom-out").addEventListener("click", () => stepDetailZoom(-40));
        document.getElementById("detail-zoom-in").addEventListener("click", () => stepDetailZoom(40));
    
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

        // ── Touch gestures: pinch zoom, one-finger pan (zoomed), swipe nav ──
        let touchStartCount = 0;
        let pinchStartDist = 0;
        let pinchStartZoom = 100;
        let swipeStartX = 0;
        let swipeStartY = 0;
        let touchLastX = 0;
        let touchLastY = 0;

        P.detailStage.addEventListener("touchstart", (e) => {
            if (P.detailOverlay.classList.contains("hidden")) return;
            if (e.touches.length === 2) {
                touchStartCount = 2;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStartDist = Math.max(1, Math.hypot(dx, dy));
                pinchStartZoom = P.detailZoom;
                e.preventDefault();
            } else if (e.touches.length === 1) {
                touchStartCount = 1;
                swipeStartX = touchLastX = e.touches[0].clientX;
                swipeStartY = touchLastY = e.touches[0].clientY;
                if (P.detailZoom > 100) e.preventDefault();
            }
        }, { passive: false });

        P.detailStage.addEventListener("touchmove", (e) => {
            if (P.detailOverlay.classList.contains("hidden")) return;
            if (e.touches.length === 2 && touchStartCount === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.max(1, Math.hypot(dx, dy));
                let z = Math.round(pinchStartZoom * (dist / pinchStartDist));
                z = Math.max(100, Math.min(500, z));
                if (z <= 100) { P.detailPanX = 0; P.detailPanY = 0; }
                P.detailZoom = z;
                P.detailZoomSlider.value = z;
                applyDetailZoom();
                e.preventDefault();
            } else if (e.touches.length === 1 && touchStartCount === 1) {
                if (P.detailZoom > 100) {
                    const cx = e.touches[0].clientX;
                    const cy = e.touches[0].clientY;
                    P.detailPanX += cx - touchLastX;
                    P.detailPanY += cy - touchLastY;
                    applyDetailZoom();
                    e.preventDefault();
                }
                touchLastX = e.touches[0].clientX;
                touchLastY = e.touches[0].clientY;
            }
        }, { passive: false });

        P.detailStage.addEventListener("touchend", (e) => {
            if (P.detailOverlay.classList.contains("hidden")) return;
            if (touchStartCount === 1) {
                const dx = touchLastX - swipeStartX;
                const dy = touchLastY - swipeStartY;
                const onNav = e.target.closest(".detail-nav-btn");
                if (P.detailZoom <= 100 && !onNav && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    e.preventDefault();
                    P.fn.navigateDetail(dx < 0 ? 1 : -1);
                } else if (!onNav && !e.target.closest("#detail-360-viewer, #detail-video") && Math.hypot(dx, dy) < 12) {
                    // tap: handled here (not via click, which is suppressed).
                    e.preventDefault();
                    registerDetailTap(swipeStartX, swipeStartY);
                }
            }
            touchStartCount = 0;
        });
        P.detailStage.addEventListener("touchcancel", () => { touchStartCount = 0; });

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
