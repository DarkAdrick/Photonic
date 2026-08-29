// Photonic module: utils
(function (P) {
    const t = P.t;
    
        async function api(method, path, body) {
            const opts = { method, headers: { "Content-Type": "application/json" } };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(path, opts);
            const ct = res.headers.get("content-type") || "";
            if (!ct.includes("application/json")) { console.error("API non-JSON:", res.status, path); return {}; }
            return res.json();
        }
    
        function is360Photo(data) {
            if (!data.width || !data.height) return false;
            const camera = data.camera_model || data.camera || "";
            const make = data.camera_make || "";
            const isTheta = camera.toUpperCase().includes("THETA") || make.toUpperCase().includes("THETA");
            const isInsta360 = camera.toUpperCase().includes("INSTA360") || make.toUpperCase().includes("INSTA360");
            const isGoPro = (camera.toUpperCase().includes("GOPRO") && camera.toUpperCase().includes("MAX")) || (make.toUpperCase().includes("GOPRO") && camera.toUpperCase().includes("MAX"));
            const isRatio2to1 = Math.abs((data.width / data.height) - 2.0) < 0.05;
            return isTheta || isInsta360 || isGoPro || isRatio2to1;
        }
    
        function isVideo(p) {
            if (!p.extension && !p.filename) return false;
            const ext = (p.extension || p.filename.split('.').pop()).toLowerCase();
            const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", "mp4", "mov", "avi", "mkv", "webm"];
            return videoExts.includes(ext) || videoExts.includes("." + ext);
        }
    
        function is360Video(p) {
            return isVideo(p) && is360Photo(p);
        }
    
        function createLoader(label) {
            const el = document.createElement("div");
            el.className = "app-loader";
            el.innerHTML =
                '<div class="app-loader-icon">' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="10"></circle>' +
                '<path d="m14.31 8 5.74 9.94"></path>' +
                '<path d="M9.69 8h11.48"></path>' +
                '<path d="m7.38 12 5.74-9.94"></path>' +
                '<path d="M9.69 16 3.95 6.06"></path>' +
                '<path d="M14.31 16H2.83"></path>' +
                '<path d="m16.62 12-5.74 9.94"></path>' +
                "</svg></div>" +
                (label ? `<span class="app-loader-label">${label}</span>` : "");
            return el;
        }
    
        function renderMetaBadges(p) {
            const tagCount = p.tag_count || 0;
            const c = p.collection_count || 0;
            if (tagCount === 0 && c === 0) return "";
            let inner = "";
            if (tagCount > 0) inner += `<div class="photo-meta-badge" title="${tagCount === 1 ? t("grid.one_tag") : t("grid.tags_badge", { count: tagCount })}"><i data-lucide="tag"></i><span>${tagCount}</span></div>`;
            if (c > 0) inner += `<div class="photo-meta-badge" title="${c === 1 ? t("grid.one_collection") : t("grid.collections_badge", { count: c })}"><i data-lucide="library"></i><span>${c}</span></div>`;
            return `<div class="photo-meta-badges">${inner}</div>`;
        }
    
        function stopVideo() {
            if (P.detailVideo) {
                P.detailVideo.pause();
                P.detailVideo.src = "";
                P.detailVideo.classList.add("hidden");
            }
            P.detailImg.classList.remove("hidden");
        }
    
        function destroy360Viewer(opts = {}) {
            stopVideo();
            destroyVideo360Viewer();
            if (P.pannellumViewer) {
                try { P.pannellumViewer.destroy(); } catch (e) { console.error(e); }
                P.pannellumViewer = null;
            }
            P.detail360Viewer.classList.add("hidden");
            P.detail360Viewer.innerHTML = "";
            if (opts.fallbackToFlatVideo && P.detailCurrentPhotoId && P.isCurrentPhoto360Video) {
                P.detailImg.classList.add("hidden");
                if (P.detailVideo) {
                    P.detailVideo.src = `/api/photos/${detailCurrentPhotoId}/stream`;
                    P.detailVideo.classList.remove("hidden");
                }
            } else {
                P.detailImg.classList.remove("hidden");
            }
            P.is360Mode = false;
            P.detail360Btn.classList.remove("active");
        }
    
        function initVideo360Viewer(photoId) {
            destroyVideo360Viewer();
            const container = document.getElementById("detail-360-viewer");
            container.innerHTML = "";
    
            P.video360Canvas = document.createElement("canvas");
            P.video360Canvas.style.cssText = "width:100%;height:100%;display:block;cursor:grab;background:#000;";
            container.appendChild(P.video360Canvas);
            const ctx = P.video360Canvas.getContext("2d");
    
            P.video360Video = document.createElement("video");
            P.video360Video.src = `/api/photos/${photoId}/stream`;
            P.video360Video.loop = true;
            P.video360Video.playsInline = true;
            P.video360Video.preload = "auto";
    
            P.video360Yaw = 0;
            P.video360Pitch = 0;
            P.video360Fov = 75;
    
            function render() {
                if (!P.video360Video || P.video360Video.paused || P.video360Video.ended) {
                    P.video360Raf = requestAnimationFrame(render);
                    return;
                }
                const vw = P.video360Video.videoWidth;
                const vh = P.video360Video.videoHeight;
                if (!vw || !vh) {
                    P.video360Raf = requestAnimationFrame(render);
                    return;
                }
                const cw = container.clientWidth;
                const ch = container.clientHeight;
                if (P.video360Canvas.width !== cw || P.video360Canvas.height !== ch) {
                    P.video360Canvas.width = cw;
                    P.video360Canvas.height = ch;
                }
                const fovRad = P.video360Fov * Math.PI / 180;
                const visibleW = vw * (P.video360Fov / 360);
                const visibleH = visibleW * (ch / cw);
                const srcX = ((P.video360Yaw % 360 + 360) % 360) / 360 * vw;
                const srcY = (P.video360Pitch + 90) / 180 * vh - visibleH / 2;
                ctx.drawImage(P.video360Video, srcX, srcY, visibleW, visibleH, 0, 0, cw, ch);
                P.video360Raf = requestAnimationFrame(render);
            }
    
            const onPointerDown = (e) => {
                P.video360Dragging = true;
                P.video360LastX = e.clientX;
                P.video360LastY = e.clientY;
                P.video360Canvas.style.cursor = "grabbing";
                e.preventDefault();
            };
            const onPointerMove = (e) => {
                if (!P.video360Dragging) return;
                const dx = e.clientX - P.video360LastX;
                const dy = e.clientY - P.video360LastY;
                P.video360Yaw -= dx * 0.3;
                P.video360Pitch = Math.max(-80, Math.min(80, P.video360Pitch + dy * 0.3));
                P.video360LastX = e.clientX;
                P.video360LastY = e.clientY;
            };
            const onPointerUp = () => {
                P.video360Dragging = false;
                if (P.video360Canvas) P.video360Canvas.style.cursor = "grab";
            };
            const onWheel = (e) => {
                P.video360Fov = Math.max(30, Math.min(110, P.video360Fov + e.deltaY * 0.05));
                e.preventDefault();
            };
    
            P.video360Canvas.addEventListener("pointerdown", onPointerDown);
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            P.video360Canvas.addEventListener("wheel", onWheel, { passive: false });
    
            P.video360Video._cleanups = () => {
                P.video360Canvas.removeEventListener("pointerdown", onPointerDown);
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", onPointerUp);
                P.video360Canvas.removeEventListener("wheel", onWheel);
            };
    
            P.video360Video.addEventListener("loadeddata", () => {
                P.video360Video.play().catch(() => {});
            });
    
            P.video360Raf = requestAnimationFrame(render);
            P.video360Video.load();
        }
    
        function destroyVideo360Viewer() {
            if (P.video360Raf) { cancelAnimationFrame(P.video360Raf); P.video360Raf = null; }
            if (P.video360Video) {
                P.video360Video.pause();
                if (P.video360Video._cleanups) P.video360Video._cleanups();
                P.video360Video.src = "";
                P.video360Video = null;
            }
            if (P.video360Canvas) { P.video360Canvas.remove(); P.video360Canvas = null; }
        }
    
        function hasWebGL() {
            try {
                const c = document.createElement("canvas");
                return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
            } catch { return false; }
        }
    
        function showToast(message, opts = {}) {
            const existing = document.querySelector(".photon-toast");
            if (existing) existing.remove();
            const toast = document.createElement("div");
            toast.className = "photon-toast";
            const icon = opts.icon || "alert-triangle";
            toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span><button class="photon-toast-close"><i data-lucide="x"></i></button>`;
            document.body.appendChild(toast);
            lucide.createIcons({ root: toast });
            toast.querySelector(".photon-toast-close").addEventListener("click", () => {
                toast.classList.add("toast-out");
                setTimeout(() => toast.remove(), 250);
            });
            if (opts.duration !== false) {
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.classList.add("toast-out");
                        setTimeout(() => toast.remove(), 250);
                    }
                }, opts.duration || 6000);
            }
        }
    
        function initPannellum(photoId) {
            const url = `/api/photos/${photoId}/raw`;
            const img = new Image();
            img.onload = () => {
                if (!P.is360Mode || P.detailCurrentPhotoId !== photoId || P.pannellumViewer) return;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (!P.is360Mode || P.detailCurrentPhotoId !== photoId || P.pannellumViewer) return;
                        P.pannellumViewer = pannellum.viewer("detail-360-viewer", {
                            "type": "equirectangular",
                            "panorama": url,
                            "autoLoad": true
                        });
                        P.pannellumViewer.on("load", () => {
                            if (P.pannellumViewer) P.pannellumViewer.resize();
                        });
                    });
                });
            };
            img.onerror = () => {
                if (P.is360Mode && P.detailCurrentPhotoId === photoId) destroy360Viewer();
            };
            img.src = url;
        }
    
        function toggle360() {
            if (!P.detailCurrentPhotoId) return;
            if (P.is360Mode) {
                destroy360Viewer({ fallbackToFlatVideo: true });
            } else {
                const data = P.detailCurrentPhotoData;
                if (data && is360Video(data)) {
                    P.is360Mode = true;
                    P.isCurrentPhoto360Video = true;
                    P.detail360Btn.classList.add("active");
                    P.detailImg.classList.add("hidden");
                    if (P.detailVideo) P.detailVideo.classList.add("hidden");
                    P.detail360Viewer.classList.remove("hidden");
                    initVideo360Viewer(P.detailCurrentPhotoId);
                } else {
                    if (!hasWebGL()) {
                        showToast(
                            `WebGL is disabled — 360° requires hardware acceleration.<br><a href="edge://settings/system" target="_blank">Open Edge Settings</a> and enable "Use hardware acceleration", then restart.`,
                            { icon: "monitor-x", duration: false }
                        );
                        return;
                    }
                    P.is360Mode = true;
                    P.isCurrentPhoto360Video = false;
                    P.detail360Btn.classList.add("active");
                    P.detailImg.classList.add("hidden");
                    P.detail360Viewer.classList.remove("hidden");
                    initPannellum(P.detailCurrentPhotoId);
                }
            }
        }
    
        function toggleFullscreen() {
            const detailImgContainer = document.getElementById("detail-image");
            if (!document.fullscreenElement) {
                detailImgContainer.requestFullscreen().catch(err => console.error(err));
            } else {
                document.exitFullscreen();
            }
        }
    
        async function checkStatus() {
            try {
                const data = await api("GET", "/api/status");
                P.statusText.textContent = t("status.connected");
                P.photoCountH.textContent = data.photo_count > 0 ? t("common.items", { count: data.photo_count.toLocaleString() }) : "";
                if (data.version && P.versionBadge) {
                    const inner = P.versionBadge.querySelector('.version-badge-inner');
                    if (inner) inner.textContent = "v" + data.version;
                    else P.versionBadge.textContent = "v" + data.version;
                }
            } catch {
                P.statusText.textContent = t("status.disconnected");
            }
        }
    
    
    // --- exports ---
        P.fn.api = api;
        P.fn.renderMetaBadges = renderMetaBadges;
        P.fn.is360Photo = is360Photo;
        P.fn.isVideo = isVideo;
        P.fn.is360Video = is360Video;
        P.fn.createLoader = createLoader;
        P.fn.destroy360Viewer = destroy360Viewer;
        P.fn.initVideo360Viewer = initVideo360Viewer;
        P.fn.hasWebGL = hasWebGL;
        P.fn.showToast = showToast;
        P.fn.initPannellum = initPannellum;
        P.fn.toggle360 = toggle360;
        P.fn.toggleFullscreen = toggleFullscreen;
        P.fn.checkStatus = checkStatus;
})(window.PhotoApp = window.PhotoApp || {});
