// Service Worker: macht Nexus offline-fähig und installierbar.
// Seite und Gehirn werden beim ersten Öffnen gespeichert, danach geht alles auch ohne Internet.
const CACHE = "nexus-v2";
const SEITEN = ["./", "./index.html", "./app.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SEITEN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.includes("/gehirn/teil-")) {
    // Gehirn-Teile: aus dem Speicher, sonst laden und speichern (alte Versionen werden gelöscht)
    e.respondWith(caches.open(CACHE).then(async c => {
      const da = await c.match(e.request);
      if (da) return da;
      const antwort = await fetch(e.request);
      if (antwort.ok) {
        for (const alt of await c.keys()) {
          const a = new URL(alt.url);
          if (a.pathname === url.pathname && a.search !== url.search) c.delete(alt);
        }
        c.put(e.request, antwort.clone());
      }
      return antwort;
    }));
    return;
  }
  // Alles andere: erst Internet (für Updates), sonst gespeicherte Version
  const schluessel = url.origin + url.pathname;
  e.respondWith(fetch(e.request).then(async antwort => {
    if (antwort.ok) { const c = await caches.open(CACHE); await c.put(schluessel, antwort.clone()); }
    return antwort;
  }).catch(() => caches.match(schluessel)));
});
