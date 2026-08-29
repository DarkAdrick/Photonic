// Photonic module: scan
(function (P) {
    const t = P.t;
        // ── Scan polling ──────────────────────────────────────────────────────
    
        async function pollScan() {
            if (P.scanPolling) return;
            P.scanPolling = true;
            pollScanLoop();
        }
    
        async function pollScanLoop() {
            let data;
            try {
                data = await P.fn.api("GET", "/api/scan/status");
            } catch (e) {
                setTimeout(pollScanLoop, 2000);
                return;
            }
            if (data.running && data.total > 0) {
                const pct = Math.round((data.done / data.total) * 100);
                P.scanProgress.classList.remove("hidden");
                P.scanFill.style.width = pct + "%";
                P.scanStatus.textContent = data.cancel
                    ? t("scan.cancelling", { done: data.done.toLocaleString(), total: data.total.toLocaleString() })
                    : t("scan.progress", { done: data.done.toLocaleString(), total: data.total.toLocaleString(), pct: pct });
                P.btnRescan.disabled = true;
                if (P.btnScanCancel) P.btnScanCancel.classList.toggle("hidden", !!data.cancel);
                P.scanPollCount++;
                const now = Date.now();
                if (now - P.lastScanRefresh >= 5000) {
                    P.lastScanRefresh = now;
                    try {
                        await P.fn.loadFilters();
                        await P.fn.checkStatus();
                    } catch (e) { /* non-fatal */ }
                }
                setTimeout(pollScanLoop, 500);
            } else if (data.running) {
                P.scanProgress.classList.remove("hidden");
                P.scanFill.style.width = "0%";
                P.scanStatus.textContent = t("scan.preparing");
                P.btnRescan.disabled = true;
                if (P.btnScanCancel) P.btnScanCancel.classList.remove("hidden");
                setTimeout(pollScanLoop, 500);
            } else {
                P.scanPollCount = 0;
                P.lastScanRefresh = 0;
                P.scanProgress.classList.add("hidden");
                if (P.btnScanCancel) P.btnScanCancel.classList.add("hidden");
                P.scanFill.style.width = "0%";
                P.scanStatus.textContent = data.cancelled ? t("scan.cancelled") : "";
                if (data.cancelled) setTimeout(() => { if (!P.scanStatus.textContent.startsWith(t("scan.starting"))) P.scanStatus.textContent = ""; }, 4000);
                P.btnRescan.disabled = false;
                document.querySelectorAll(".settings-row-btn.scan").forEach(btn => {
                    btn.disabled = false;
                    btn.querySelector("svg")?.classList.remove("spinning");
                });
                try {
                    P.fn.onFilterChange();
                    await P.fn.loadSidebar();
                    await P.fn.loadFilters();
                    await P.fn.checkStatus();
                } catch (e) { /* keep flag clear even if refresh fails */ }
                P.scanPolling = false;
            }
        }
    
    
    // --- exports ---
        P.fn.pollScan = pollScan;
})(window.PhotoApp = window.PhotoApp || {});
