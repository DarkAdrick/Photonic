// Photonic module: dialog
(function (P) {
    const t = P.t;
        // ── Dialog ────────────────────────────────────────────────────────────
    
        function openDialog() {
            P.dialog.classList.remove("hidden");
            P.folderInput.value = "";
            P.folderInput.focus();
        }
    
        function closeDialog() {
            P.dialog.classList.add("hidden");
        }
    
        async function addFolder() {
            const path = P.folderInput.value.trim();
            if (!path) return;
            closeDialog();
            await P.fn.api("POST", "/api/folders", { path });
            await P.fn.loadSidebar();
            await P.fn.loadFilters();
            P.btnRescan.disabled = false;
            P.scanStatus.textContent = t("scan.starting");
            const res = await P.fn.api("POST", "/api/scan", { path });
            if (res.error === "scan_already_running") {
                P.scanStatus.textContent = t("scan.running_next");
                P.fn.pollScan();
                return;
            }
            P.scanPollCount = 0;
            P.fn.pollScan();
        }
    
        async function rescanAll() {
            P.btnRescan.disabled = true;
            P.scanStatus.textContent = t("scan.starting");
            const res = await P.fn.api("POST", "/api/scan", { path: "all" });
            if (res.error === "scan_already_running") {
                P.scanStatus.textContent = t("scan.running");
                P.btnRescan.disabled = false;
                P.fn.pollScan();
                return;
            }
            P.scanPollCount = 0;
            P.fn.pollScan();
        }
    
    
    // --- exports ---
        P.fn.openDialog = openDialog;
        P.fn.closeDialog = closeDialog;
        P.fn.addFolder = addFolder;
        P.fn.rescanAll = rescanAll;
})(window.PhotoApp = window.PhotoApp || {});
