// Offline support: network first (so a new version shows on the next reload), cache as fallback.
// The page sends the list of files it loaded (see js/app/service-worker.js), so there is no precache list to maintain.
const CACHE = "nb-v3";
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
    try {
      // no-cache: revalidate with the server instead of trusting the HTTP cache (navigations can't take options)
      const res = await (req.mode === "navigate" ? fetch(req) : fetch(req, {cache: "no-cache"}));
      if (res.ok || res.type === "opaque") c.put(key, res.clone());
      return res;
    } catch (err){
      const hit = await c.match(key, {ignoreSearch: req.mode === "navigate"});
      if (hit) return hit;
      throw err;
    }
  }));
});
