// Offline support: stale-while-revalidate for this site's files and the Google Fonts.
// The page sends the list of files it loaded (see app.js), so there is no precache list to maintain.
const CACHE = "nb-v1";
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "index.html", "manifest.webmanifest"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "cache" && Array.isArray(e.data.urls)){
    const urls = e.data.urls.filter(u => u.startsWith(self.location.origin) || FONTS.test(u));
    e.waitUntil(caches.open(CACHE).then(c => Promise.all(urls.map(u => c.match(u).then(hit => hit || c.add(u).catch(() => {}))))));
  }
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !FONTS.test(req.url)) return;   // dictionary/translation APIs go straight to the network
  e.respondWith(caches.open(CACHE).then(async c => {
    const key = req.mode === "navigate" ? "./" : req;
    const hit = await c.match(key, {ignoreSearch: req.mode === "navigate"});
    const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(key, res.clone()); return res; }).catch(() => hit);
    if (hit){ e.waitUntil(net); return hit; }
    return net;
  }));
});
