/* Global i18n — plain script loaded before app.js.
 * Exposes window.I18n: { t, availableLanguages, getCurrent, setLanguage, applyI18n, ready }
 */
(() => {
    const LANG_KEY = "photonic.lang";

    const availableLanguages = [
        { code: "en-US", flag: "/i18n/flags/us.svg", name: "English" },
        { code: "fr-FR", flag: "/i18n/flags/fr.svg", name: "Français" },
    ];

    let currentDict = {};
    let currentLang = "en-US";
    let readyPromise = null;

    function loadDict(code) {
        return fetch(`/i18n/${code}.json`, { cache: "no-store" })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error("i18n not found"))))
            .catch(() => ({}));
    }

    function get(key, params, plural) {
        let tmpl = currentDict[key];
        if (tmpl === undefined || tmpl === null) tmpl = key;
        let str = String(tmpl);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                str = str.split(`{${k}}`).join(v);
            }
        }
        return str;
    }

    window.I18n = {
        availableLanguages,
        ready() {
            return readyPromise || ((readyPromise = init()), readyPromise);
        },
        getCurrent() {
            return currentLang;
        },
        t(key, params) {
            return get(key, params);
        },
        setLanguage(code, opts) {
            return loadDict(code).then(dict => {
                currentLang = code;
                currentDict = dict;
                try { localStorage.setItem(LANG_KEY, code); } catch (_) {}
                if (opts && opts.persist !== false) {
                    try {
                        fetch("/api/settings/language", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ language: code }),
                        }).catch(() => {});
                    } catch (_) {}
                }
                applyI18n();
                return dict;
            });
        },
        applyI18n,
    };

    function applyI18n() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const k = el.getAttribute("data-i18n");
            el.textContent = get(k);
        });
        document.querySelectorAll("[data-i18n-title]").forEach(el => {
            const k = el.getAttribute("data-i18n-title");
            el.setAttribute("title", get(k));
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const k = el.getAttribute("data-i18n-placeholder");
            el.setAttribute("placeholder", get(k));
        });
    }

    function init() {
        const saved = (() => {
            try { return localStorage.getItem(LANG_KEY); } catch (_) { return null; }
        })();
        if (saved && availableLanguages.some(l => l.code === saved)) {
            return loadDict(saved).then(dict => {
                currentLang = saved;
                currentDict = dict;
            }).catch(() => loadDict("en-US").then(d => { currentLang = "en-US"; currentDict = d; }));
        }
        return fetch("/api/settings/language")
            .then(r => (r.ok ? r.json() : { language: null }))
            .then(d => {
                const code = d.language && availableLanguages.some(l => l.code === d.language) ? d.language : "en-US";
                return loadDict(code).then(dict => { currentLang = code; currentDict = dict; });
            })
            .catch(() => loadDict("en-US").then(d => { currentLang = "en-US"; currentDict = d; }));
    }
})();
