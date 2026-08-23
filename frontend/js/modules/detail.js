import { api } from './api.js';

export function initDetailModule(context) {
    const {
        detailOverlay,
        detailImg,
        detailFname,
        detailMeta,
        detailMapSec,
        detailCoords,
        detailTags,
        detailRating,
        detailCounter,
        detailClose,
        detailPrev,
        detailNext,
        detailRotateCW,
        detailRotateCCW,
        detailStage,
        detailZoomSlider,
        detailZoomLabel,
        detail360Btn,
        detail360Viewer,
        detailVideo,
        detailFooterCenter,
        detailFooterRight,
        detailFullscreenBtn,
        getCurrentPhotoIds,
        loadSidebar,
    } = context;

    let detailIndex = 0;
    let detailMap = null;
    let detailRotation = 0;
    let detailZoom = 100;
    let detailPanX = 0;
    let detailPanY = 0;
    let detailDragging = false;
    let detailDragStartX = 0;
    let detailDragStartY = 0;
    let detailCurrentPhotoId = null;
    let detailThumbVersion = 0;

    let pannellumViewer = null;
    let is360Mode = false;

    const TAG_COLORS = [
        "#e74c3c", "#2ecc71", "#3498db", "#f1c40f", "#9b59b6",
        "#e67e22", "#1abc9c", "#e84393", "#00cec9", "#fd79a8"
    ];

    function hashStr(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    function is360Photo(data) {
        if (!data.width || !data.height) return false;
        const isTheta = data.camera_model && data.camera_model.toUpperCase().includes("THETA");
        const isInsta360 = data.camera_model && data.camera_model.toUpperCase().includes("INSTA360");
        const isGoPro = data.camera_model && data.camera_model.toUpperCase().includes("GOPRO") && data.camera_model.toUpperCase().includes("MAX");
        const isRatio2to1 = Math.abs((data.width / data.height) - 2.0) < 0.05;
        return isTheta || isInsta360 || isGoPro || isRatio2to1;
    }

    function isVideo(p) {
        if (!p.extension && !p.filename) return false;
        const ext = (p.extension || p.filename.split('.').pop()).toLowerCase();
        const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", "mp4", "mov", "avi", "mkv", "webm"];
        return videoExts.includes(ext) || videoExts.includes("." + ext);
    }

    function stopVideo() {
        if (detailVideo) {
            detailVideo.pause();
            detailVideo.src = "";
            detailVideo.classList.add("hidden");
        }
        detailImg.classList.remove("hidden");
    }

    function destroy360Viewer() {
        stopVideo();
        if (pannellumViewer) {
            try {
                pannellumViewer.destroy();
            } catch (e) {
                console.error("Error destroying pannellum:", e);
            }
            pannellumViewer = null;
        }
        detail360Viewer.classList.add("hidden");
        detail360Viewer.innerHTML = "";
        detailImg.classList.remove("hidden");
        is360Mode = false;
        detail360Btn.classList.remove("active");
    }

    function hasWebGL() {
        try {
            const c = document.createElement("canvas");
            return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
        } catch { return false; }
    }

    function toggle360() {
        if (!detailCurrentPhotoId) return;
        if (is360Mode) {
            destroy360Viewer();
        } else {
            if (!hasWebGL()) {
                console.warn("WebGL not available — cannot open 360° viewer");
                return;
            }
            is360Mode = true;
            detail360Btn.classList.add("active");
            detailImg.classList.add("hidden");
            detail360Viewer.classList.remove("hidden");
            pannellumViewer = pannellum.viewer('detail-360-viewer', {
                "type": "equirectangular",
                "panorama": `/api/photos/${detailCurrentPhotoId}/raw`,
                "autoLoad": true
            });
        }
    }

    function toggleFullscreen() {
        const detailImgContainer = document.getElementById("detail-image");
        if (!document.fullscreenElement) {
            detailImgContainer.requestFullscreen().catch(err => {
                console.error("Error enabling fullscreen:", err);
            });
        } else {
            document.exitFullscreen();
        }
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

    function formatSize(bytes) {
        if (!bytes) return null;
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    }

    async function openDetail(photoId) {
        const currentPhotoIds = getCurrentPhotoIds();
        detailIndex = currentPhotoIds.indexOf(photoId);
        detailRotation = 0;
        resetDetailZoom();
        detailThumbVersion = 0;
        await loadDetail(photoId);
        detailOverlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeDetail() {
        destroy360Viewer();
        detailOverlay.classList.add("hidden");
        document.body.style.overflow = "";
        detailCurrentPhotoId = null;
        resetDetailZoom();
        if (detailMap) { detailMap.remove(); detailMap = null; }
    }

    async function navigateDetail(delta) {
        const currentPhotoIds = getCurrentPhotoIds();
        const newIdx = detailIndex + delta;
        if (newIdx < 0 || newIdx >= currentPhotoIds.length) return;
        detailIndex = newIdx;
        resetDetailZoom();
        await loadDetail(currentPhotoIds[newIdx]);
    }

    async function loadDetail(photoId) {
        destroy360Viewer();
        detailCurrentPhotoId = photoId;
        const data = await api("GET", `/api/photos/${photoId}`);
        if (data.error) return;

        detailImg.src = `/api/photos/${photoId}/thumb/large?t=${detailThumbVersion}`;
        detailFname.textContent = data.filename;
        const currentPhotoIds = getCurrentPhotoIds();
        detailCounter.textContent = `${detailIndex + 1} / ${currentPhotoIds.length}`;
        applyDetailZoom();

        if (detailFooterCenter) detailFooterCenter.classList.remove("hidden");
        if (detailFooterRight) detailFooterRight.classList.remove("hidden");

        if (isVideo(data)) {
            detail360Btn.classList.add("hidden");
            detailImg.classList.add("hidden");
            if (detailVideo) {
                detailVideo.src = `/api/photos/${photoId}/raw`;
                detailVideo.classList.remove("hidden");
            }
            if (detailFooterCenter) detailFooterCenter.classList.add("hidden");
            if (detailFooterRight) detailFooterRight.classList.add("hidden");
        } else if (is360Photo(data)) {
            if (hasWebGL()) {
                detail360Btn.classList.remove("hidden");
                is360Mode = true;
                detail360Btn.classList.add("active");
                detailImg.classList.add("hidden");
                detail360Viewer.classList.remove("hidden");
                pannellumViewer = pannellum.viewer('detail-360-viewer', {
                    "type": "equirectangular",
                    "panorama": `/api/photos/${photoId}/raw`,
                    "autoLoad": true
                });
            } else {
                detail360Btn.classList.add("hidden");
            }
            if (detailFooterCenter) detailFooterCenter.classList.add("hidden");
            if (detailFooterRight) detailFooterRight.classList.add("hidden");
        } else {
            detail360Btn.classList.add("hidden");
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

        detailMeta.innerHTML = "";
        for (const [label, value] of rows) {
            if (!value) continue;
            detailMeta.innerHTML += `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-value" title="${value}">${value}</span></div>`;
        }

        if (data.latitude != null && data.longitude != null) {
            detailMapSec.classList.remove("hidden");
            detailCoords.textContent = `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
            setTimeout(() => {
                if (detailMap) detailMap.remove();
                detailMap = L.map("detail-map", { zoomControl: false, attributionControl: false }).setView([data.latitude, data.longitude], 13);
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(detailMap);
                L.marker([data.latitude, data.longitude]).addTo(detailMap);
                setTimeout(() => detailMap.invalidateSize(), 100);
            }, 50);
        } else {
            detailMapSec.classList.add("hidden");
        }

        const tagData = await api("GET", `/api/photos/${photoId}/tags`);

        detailTags.innerHTML = "";
        for (const t of tagData) {
            const color = t.color || TAG_COLORS[Math.abs(hashStr(t.name)) % TAG_COLORS.length];
            const pill = document.createElement("span");
            pill.className = "tag-pill";
            pill.textContent = t.name;
            pill.style.setProperty("--tag-color", color);
            pill.addEventListener("click", async () => {
                await api("DELETE", `/api/photos/${photoId}/tags/${t.id}`);
                await loadDetail(photoId);
            });
            detailTags.appendChild(pill);
        }

        detailRating.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            star.className = "star" + (i <= (data.rating || 0) ? " filled" : "");
            star.textContent = "★";
            star.dataset.value = i;
            star.addEventListener("click", async () => {
                await api("POST", `/api/photos/${photoId}/rate`, { rating: i });
                await loadDetail(photoId);
            });
            detailRating.appendChild(star);
        }
    }

    function resetDetailZoom() {
        detailZoom = 100;
        detailPanX = 0;
        detailPanY = 0;
        if (detailZoomSlider) detailZoomSlider.value = 100;
        applyDetailZoom();
    }

    function applyDetailZoom() {
        if (!detailImg) return;
        if (detailZoomSlider) detailZoomSlider.value = detailZoom;
        if (detailZoomLabel) detailZoomLabel.textContent = `${detailZoom}%`;

        let transform = `scale(${detailZoom / 100})`;
        if (detailZoom > 100) {
            detailImg.classList.add("zoomed");
            transform += ` translate(${detailPanX}px, ${detailPanY}px)`;
        } else {
            detailImg.classList.remove("zoomed");
        }
        transform += ` rotate(${detailRotation}deg)`;
        detailImg.style.transform = transform;
    }

    // Initialize Event Listeners for Details
    function init() {
        detailClose.addEventListener("click", closeDetail);
        detail360Btn.addEventListener("click", toggle360);
        detailFullscreenBtn.addEventListener("click", toggleFullscreen);

        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement) {
                detailFullscreenBtn.innerHTML = '<i data-lucide="minimize"></i>';
                detailFullscreenBtn.title = "Quitter le plein écran";
            } else {
                detailFullscreenBtn.innerHTML = '<i data-lucide="maximize"></i>';
                detailFullscreenBtn.title = "Plein écran";
            }
            lucide.createIcons();
        });

        detailPrev.addEventListener("click", () => navigateDetail(-1));
        detailNext.addEventListener("click", () => navigateDetail(1));

        detailRotateCW.addEventListener("click", async () => {
            if (!detailCurrentPhotoId) return;
            detailRotateCW.disabled = true;
            detailRotateCCW.disabled = true;
            const res = await api("POST", `/api/photos/${detailCurrentPhotoId}/rotate`, { degrees: 90 });
            if (res.ok) {
                detailThumbVersion++;
                detailRotation = 0;
                loadDetail(detailCurrentPhotoId);
                detailMeta.querySelectorAll(".meta-row").forEach(row => {
                    if (row.querySelector(".meta-label")?.textContent === "Dimensions") {
                        row.querySelector(".meta-value").textContent = `${res.width} × ${res.height}`;
                    }
                });
            }
            detailRotateCW.disabled = false;
            detailRotateCCW.disabled = false;
        });

        detailRotateCCW.addEventListener("click", async () => {
            if (!detailCurrentPhotoId) return;
            detailRotateCW.disabled = true;
            detailRotateCCW.disabled = true;
            const res = await api("POST", `/api/photos/${detailCurrentPhotoId}/rotate`, { degrees: -90 });
            if (res.ok) {
                detailThumbVersion++;
                detailRotation = 0;
                loadDetail(detailCurrentPhotoId);
                detailMeta.querySelectorAll(".meta-row").forEach(row => {
                    if (row.querySelector(".meta-label")?.textContent === "Dimensions") {
                        row.querySelector(".meta-value").textContent = `${res.width} × ${res.height}`;
                    }
                });
            }
            detailRotateCW.disabled = false;
            detailRotateCCW.disabled = false;
        });

        detailZoomSlider.addEventListener("input", (e) => {
            detailZoom = parseInt(e.target.value);
            if (detailZoom <= 100) { detailPanX = 0; detailPanY = 0; }
            applyDetailZoom();
        });

        detailStage.addEventListener("wheel", (e) => {
            if (detailOverlay.classList.contains("hidden")) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? 40 : -40;
            detailZoom = Math.max(100, Math.min(500, detailZoom + delta));
            detailZoomSlider.value = detailZoom;
            if (detailZoom <= 100) { detailPanX = 0; detailPanY = 0; }
            applyDetailZoom();
        }, { passive: false });

        detailImg.addEventListener("mousedown", (e) => {
            if (detailZoom <= 100) return;
            e.preventDefault();
            detailDragging = true;
            detailDragStartX = e.clientX - detailPanX;
            detailDragStartY = e.clientY - detailPanY;
        });

        document.addEventListener("mousemove", (e) => {
            if (!detailDragging) return;
            detailPanX = e.clientX - detailDragStartX;
            detailPanY = e.clientY - detailDragStartY;
            applyDetailZoom();
        });

        document.addEventListener("mouseup", () => { detailDragging = false; });

        detailOverlay.addEventListener("click", (e) => { if (e.target === detailOverlay) closeDetail(); });
    }

    init();

    return {
        openDetail,
        closeDetail,
        navigateDetail,
        loadDetail,
        is360Photo,
        isVideo
    };
}
