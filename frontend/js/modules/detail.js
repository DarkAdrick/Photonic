// Photonic module: detail
(function (P) {
    const t = P.t;
        // ── Photo Detail ──────────────────────────────────────────────────────
    
        function trackPhotoIds() {
            P.currentPhotoIds = [];
            const container = P.activeView === "locations" ? P.mapPhotos : P.photoGrid;
            container.querySelectorAll(".photo-card").forEach(card => {
                const id = parseInt(card.dataset.photoId);
                if (id) P.currentPhotoIds.push(id);
            });
        }
    
        async function openDetail(photoId) {
            trackPhotoIds();
            P.detailIndex = P.currentPhotoIds.indexOf(photoId);
            P.detailRotation = 0;
            P.fn.resetDetailZoom();
            P.detailThumbVersion = 0;
            P.detailOverlay.classList.remove("hidden");
            document.body.style.overflow = "hidden";
            try {
                await loadDetail(photoId);
            } catch (e) {
                console.error("Failed to load detail:", e);
            }
        }
    
        function closeDetail() {
            P.fn.destroy360Viewer();
            P.detailOverlay.classList.add("hidden");
            document.body.style.overflow = "";
            P.detailCurrentPhotoId = null;
            P.detailCurrentPhotoData = null;
            P.fn.resetDetailZoom();
            if (P.detailMap) { P.detailMap.remove(); P.detailMap = null; }
        }
    
        async function navigateDetail(delta) {
            const newIdx = P.detailIndex + delta;
            if (newIdx < 0 || newIdx >= P.currentPhotoIds.length) return;
            P.detailIndex = newIdx;
            P.fn.hideDetailMenu();
            P.fn.resetDetailZoom();
            await loadDetail(P.currentPhotoIds[newIdx]);
        }
    
        async function loadDetail(photoId) {
            P.fn.destroy360Viewer();
            P.detailCurrentPhotoId = photoId;
            const data = await P.fn.api("GET", `/api/photos/${photoId}`);
            if (data.error) return;
            P.detailCurrentPhotoData = data;
    
            P.detailImg.src = `/api/photos/${photoId}/thumb/large?t=${P.detailThumbVersion}`;
            P.detailFname.textContent = data.filename;
            P.detailCounter.textContent = `${P.detailIndex + 1} / ${P.currentPhotoIds.length}`;
            P.fn.applyDetailZoom();
    
            if (P.detailFooterCenter) P.detailFooterCenter.classList.remove("hidden");
            if (P.detailFooterRight) P.detailFooterRight.classList.remove("hidden");
    
            if (P.fn.is360Video(data)) {
                P.isCurrentPhoto360Video = true;
                P.detail360Btn.classList.remove("hidden");
                P.is360Mode = true;
                P.detail360Btn.classList.add("active");
                P.detailImg.classList.add("hidden");
                P.detail360Viewer.classList.remove("hidden");
                P.fn.initVideo360Viewer(photoId);
                if (P.detailFooterCenter) P.detailFooterCenter.classList.add("hidden");
                if (P.detailFooterRight) P.detailFooterRight.classList.add("hidden");
            } else if (P.fn.isVideo(data)) {
                P.detail360Btn.classList.add("hidden");
                P.detailImg.classList.add("hidden");
                if (P.detailVideo) {
                    P.detailVideo.src = `/api/photos/${photoId}/stream`;
                    P.detailVideo.classList.remove("hidden");
                }
                if (P.detailFooterCenter) P.detailFooterCenter.classList.add("hidden");
                if (P.detailFooterRight) P.detailFooterRight.classList.add("hidden");
            } else if (P.fn.is360Photo(data)) {
                if (P.fn.hasWebGL()) {
                    P.detail360Btn.classList.remove("hidden");
                    P.is360Mode = true;
                    P.detail360Btn.classList.add("active");
                    P.detailImg.classList.add("hidden");
                    P.detail360Viewer.classList.remove("hidden");
                    P.fn.initPannellum(photoId);
                } else {
                    P.detail360Btn.classList.add("hidden");
                    P.fn.showToast(
                        `This is a 360° photo but WebGL is disabled.<br><a href="edge://settings/system" target="_blank">Enable hardware acceleration</a> in Edge and restart to view it.`,
                        { icon: "monitor-x", duration: 8000 }
                    );
                }
                if (P.detailFooterCenter) P.detailFooterCenter.classList.add("hidden");
                if (P.detailFooterRight) P.detailFooterRight.classList.add("hidden");
            } else {
                P.detail360Btn.classList.add("hidden");
            }
    
            lucide.createIcons();
    
            const rows = [
                ["File", data.filename],
                ["Path", data.path],
                ["Size", formatSize(data.size)],
                ["Dimensions", data.width && data.height ? `${data.width} × ${data.height}` : null],
                ["Format", data.extension ? data.extension.toUpperCase() : null],
                ["Camera", [data.camera_make, data.camera_model].filter(Boolean).join(" ")],
                ["Lens", data.lens],
                ["Focal Length", data.focal_length],
                ["Aperture", data.aperture ? `f/${data.aperture}` : null],
                ["Shutter Speed", data.shutter_speed],
                ["ISO", data.iso],
                ["Date Taken", formatExifDateStr(data.date_taken)],
                ["Created", formatEpochStr(data.created_date)],
                ["Modified", formatEpochStr(data.modified_date)],
            ];
    
            P.detailMeta.innerHTML = "";
            for (const [label, value] of rows) {
                if (!value) continue;
                P.detailMeta.innerHTML += `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-value" title="${value}">${value}</span></div>`;
            }
    
            if (data.latitude != null && data.longitude != null) {
                P.detailMapSec.classList.remove("hidden");
                P.detailCoords.textContent = `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
                setTimeout(() => {
                    if (P.detailMap) P.detailMap.remove();
                    P.detailMap = L.map("detail-map", { zoomControl: false, attributionControl: false }).setView([data.latitude, data.longitude], 13);
                    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(P.detailMap);
                    L.marker([data.latitude, data.longitude]).addTo(P.detailMap);
                    setTimeout(() => P.detailMap.invalidateSize(), 100);
                }, 50);
            } else {
                P.detailMapSec.classList.add("hidden");
            }
    
            const collectionData = await P.fn.api("GET", `/api/photos/${photoId}/collections`);
            const collectionsList = Array.isArray(collectionData) ? collectionData : [];
            P.detailCollections.innerHTML = "";
            for (const c of collectionsList) {
                const color = c.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(c.name)) % P.TAG_COLORS.length];
                const pill = document.createElement("span");
                pill.className = "collection-pill";
                pill.style.setProperty("--collection-color", color);
                pill.title = "Click to remove";
                
                const icon = c.icon ? `<i data-lucide="${c.icon}"></i>` : `<i data-lucide="library"></i>`;
                pill.innerHTML = `${icon}${c.name}`;
                
                pill.addEventListener("click", async () => {
                    await P.fn.api("DELETE", `/api/photos/${photoId}/collections/${c.id}`);
                    await loadDetail(photoId);
                    P.fn.loadSidebar();
                });
                P.detailCollections.appendChild(pill);
            }
            const addCollBtn = document.createElement("span");
            addCollBtn.className = "collection-pill tag-add";
            addCollBtn.innerHTML = `<i data-lucide="plus"></i> ${t("detail.add_to_collection")}`;
            addCollBtn.addEventListener("click", () => P.fn.openCollectionModal(photoId));
            P.detailCollections.appendChild(addCollBtn);
            lucide.createIcons({ root: P.detailCollections });
    
            const tagData = await P.fn.api("GET", `/api/photos/${photoId}/tags`);
            const tagList = Array.isArray(tagData) ? tagData : [];
    
            P.detailTags.innerHTML = "";
            for (const tobj of tagList) {
                const color = tobj.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(tobj.name)) % P.TAG_COLORS.length];
                const pill = document.createElement("span");
                pill.className = "tag-pill";
                pill.textContent = tobj.name;
                pill.style.setProperty("--tag-color", color);
                pill.title = t("detail.click_to_remove");
                pill.addEventListener("click", async () => {
                    await P.fn.api("DELETE", `/api/photos/${photoId}/tags/${tobj.id}`);
                    await loadDetail(photoId);
                });
                P.detailTags.appendChild(pill);
            }
    
            const addBtn = document.createElement("span");
            addBtn.className = "tag-pill tag-add";
            addBtn.innerHTML = `<i data-lucide="plus"></i> ${t("detail.add_tag")}`;
            addBtn.addEventListener("click", () => P.fn.openTagModal(photoId));
            P.detailTags.appendChild(addBtn);
            lucide.createIcons({ root: P.detailTags });
    
            P.detailRating.innerHTML = "";
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement("span");
                star.className = "star" + (i <= (data.rating || 0) ? " filled" : "");
                star.textContent = "★";
                star.dataset.value = i;
                star.addEventListener("click", async () => {
                    await P.fn.api("POST", `/api/photos/${photoId}/rate`, { rating: i });
                    await loadDetail(photoId);
                });
                P.detailRating.appendChild(star);
            }
        }
    
        function formatSize(bytes) {
            if (!bytes) return null;
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
            return (bytes / 1048576).toFixed(1) + " MB";
        }
    
        function parseExifDate(exifStr) {
            if (!exifStr) return null;
            const parts = exifStr.trim().split(" ");
            if (parts.length !== 2) return null;
            const dateParts = parts[0].split(":");
            const timeParts = parts[1].split(":");
            if (dateParts.length === 3 && timeParts.length === 3) {
                return new Date(
                    parseInt(dateParts[0]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[2]),
                    parseInt(timeParts[0]),
                    parseInt(timeParts[1]),
                    parseInt(timeParts[2])
                );
            }
            return null;
        }
    
        function formatDateTime(date) {
            if (!date || isNaN(date.getTime())) return null;
            return date.toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
        }
    
        function formatExifDateStr(exifStr) {
            const date = parseExifDate(exifStr);
            return date ? formatDateTime(date) : exifStr;
        }
    
        function formatEpochStr(epochStr) {
            if (!epochStr) return null;
            const t = parseFloat(epochStr);
            if (isNaN(t)) return epochStr;
            const date = new Date(t * 1000);
            return formatDateTime(date);
        }
    
    
    // --- exports ---
        P.fn.openDetail = openDetail;
        P.fn.closeDetail = closeDetail;
        P.fn.navigateDetail = navigateDetail;
        P.fn.loadDetail = loadDetail;
        P.fn.formatDateTime = formatDateTime;
})(window.PhotoApp = window.PhotoApp || {});
