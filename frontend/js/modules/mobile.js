// Photonic module: mobile (responsive nav + touch interactions)
(function () {
    function isMobile() {
        return window.innerWidth <= 768;
    }

    // On mobile, promote .search-line to a direct child of #header so the
    // search row can span the full header width on line 2 while the action
    // buttons stay beside the logo on line 1. Restored on desktop.
    function reorderHeaderLayout() {
        const header = document.getElementById("header");
        const headerRight = header && header.querySelector(".header-right");
        const searchLine = header && header.querySelector(".search-line");
        if (!header || !headerRight || !searchLine) return;

        if (isMobile()) {
            if (searchLine.parentElement === headerRight) {
                header.appendChild(searchLine);
            }
        } else {
            if (searchLine.parentElement !== headerRight) {
                const donate = headerRight.querySelector(".donate-header-btn");
                headerRight.insertBefore(searchLine, donate);
            }
        }
    }

    function toggleSidebar(open) {
        const sidebar = document.getElementById("sidebar");
        if (!sidebar) return;
        if (open === undefined) open = !sidebar.classList.contains("mobile-open");
        sidebar.classList.toggle("mobile-open", open);
        const backdrop = document.getElementById("sidebar-backdrop");
        if (backdrop) backdrop.classList.toggle("mobile-open", open);
        const btnMenu = document.getElementById("btn-menu");
        if (btnMenu) btnMenu.classList.toggle("active", open);
        document.body.classList.toggle("sidebar-open", open);
    }

    function closeSidebar() {
        toggleSidebar(false);
    }

    function init() {
        const btnMenu = document.getElementById("btn-menu");
        const backdrop = document.getElementById("sidebar-backdrop");

        if (btnMenu) {
            btnMenu.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleSidebar();
            });
        }

        if (backdrop) {
            backdrop.addEventListener("click", closeSidebar);
        }

        // Close sidebar when a nav item is clicked (mobile only)
        document.querySelectorAll("#sidebar nav ul li, #sidebar-filters .folder-item, #sidebar-filters .collection-item, #sidebar-filters .tag-item").forEach(el => {
            el.addEventListener("click", () => {
                if (isMobile()) closeSidebar();
            });
        });

        // Close sidebar on Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && isMobile()) closeSidebar();
        });

        // Close sidebar when resizing to desktop
        window.addEventListener("resize", () => {
            reorderHeaderLayout();
            if (!isMobile()) closeSidebar();
        });

        reorderHeaderLayout();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
