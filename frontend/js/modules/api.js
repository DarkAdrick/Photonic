export async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
        console.error("API non-JSON:", res.status, path);
        return {};
    }
    return res.json();
}
