/* Admin-scope-only service worker. Never intercept external services or requests outside /admin/. */
const CACHE_PREFIX = "admin-shell-";
const CACHE_NAME = "admin-shell-v4";
const SHELL = ["./","./offline.html","./admin-pwa.js","./admin-pwa.css",
  "./admin-icons/icon-192.png","./admin-icons/icon-512.png","./admin-icons/icon-maskable-512.png"];
const ADMIN_BASE = new URL("./", self.registration.scope);
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== ADMIN_BASE.origin || !url.pathname.startsWith(ADMIN_BASE.pathname)) return;
  const isAdminNavigation = request.mode === "navigate" &&
    (url.pathname === ADMIN_BASE.pathname || url.pathname === ADMIN_BASE.pathname + "index.html");
  if (isAdminNavigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./", response.clone());
        }
        return response;
      } catch {
        return (await caches.match("./offline.html")) ||
          new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }
  const isShellAsset = SHELL.some(path => {
    const asset = new URL(path, ADMIN_BASE);
    return asset.origin === url.origin && asset.pathname === url.pathname;
  });
  if (!isShellAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok && response.type !== "opaque") await cache.put(request, response.clone());
    return response;
  })());
});