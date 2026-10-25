// JSON GET with a timeout, for the free APIs (all allow CORS).
export async function getJSON(url, ms){
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), ms || 9000) : null;
  try {
    const r = await fetch(url, ctl ? {signal: ctl.signal} : {});
    if (!r.ok) throw new Error("http " + r.status);
    return await r.json();
  } finally { if (t) clearTimeout(t); }
}
