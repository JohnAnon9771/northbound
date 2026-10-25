// Offline: the service worker caches every file this page loaded (see sw.js). Only on HTTPS, so localhost isn't affected.
export function registerSW(){
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then(reg => {
    const urls = [location.href.split("#")[0]].concat(performance.getEntriesByType("resource").map(r => r.name));
    if (reg.active) reg.active.postMessage({type: "cache", urls});
  }).catch(() => {});
}
