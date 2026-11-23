/* Admin-only app shell. Never cache Supabase/API/auth responses or user data. */
const CACHE_PREFIX = "admin-shell-";
const CACHE_NAME = "admin-shell-v1";
const SHELL = [
  "./",
  "./offline.html",
  "./admin-pwa.js",
  "./admin-pwa.css",
  "./admin-icons/icon-192.svg",
  "./admin-icons/icon-512.svg",
  "./admin-icons/icon-maskable-512.svg",
  "../css/styles.css",
  "../css/cosmic-splash.css",
  "../js/state.js",
  "../js/supabase.js",
  "../js/icons.js",
  "../js/stack.js",
  "../js/connections.js",
  "../js/star-chaser.js",
  "../js/config.js",
  "../js/site.js",
  "../js/control-center.js",
  "../js/auth.js",
  "../js/storage.js",
  "../js/database.js",
  "../js/migration.js",
  "../js/main.js",
  "../js/cosmic-splash.js"
];

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
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const adminBase = new URL("./", self.registration.scope);
  const isAdminNavigation = request.mode === "navigate" &&
    (url.pathname === adminBase.pathname || url.pathname === adminBase.pathname + "index.html");

  if (isAdminNavigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put("./", response.clone());
        }
        return response;
      } catch {
        return (await caches.match("./offline.html")) ||
          new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  /* Cache only known, same-origin static shell files. Dynamic data, RPCs, auth,
     storage uploads, and all other requests always go to the network. */
  const staticPath = SHELL.some(path => {
    const asset = new URL(path, self.registration.scope);
    return asset.origin === url.origin && asset.pathname === url.pathname;
  });
  if (!staticPath || url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/") ||
      url.pathname.includes("/storage/") || url.pathname.includes("/functions/")) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok && response.type !== "opaque") await cache.put(request, response.clone());
    return response;
  })());
});