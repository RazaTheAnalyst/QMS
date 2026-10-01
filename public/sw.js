/* QMS service worker — installable PWA without stale shells.
 * - Takes over immediately (replaces the old Vite/Workbox worker).
 * - NEVER caches Supabase API/auth traffic.
 * - Navigations are network-first (always the fresh build).
 * - Static assets, fonts and images are cached for offline resilience.
 */
const STATIC_CACHE = "qms-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          // Wipe the legacy Vite/Workbox precaches plus any outdated qms caches.
          if (name.startsWith("workbox-") || (name.startsWith("qms-") && name !== STATIC_CACHE)) {
            return caches.delete(name);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

function isBypassed(url) {
  return (
    url.hostname.includes("supabase.co") ||
    url.pathname.includes("/auth/") ||
    url.pathname.includes("/rest/") ||
    url.pathname.includes("/realtime/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isBypassed(url)) return; // network-only: auth + API never cached

  // Navigations: network first so users never get a stale app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => Response.error())
    );
    return;
  }

  // Static assets, fonts, images: stale-while-revalidate.
  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style";

  if (cacheable) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })()
    );
  }
});
