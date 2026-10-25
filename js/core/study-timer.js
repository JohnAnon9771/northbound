// One running study timer, kept in localStorage so it survives reloads.
// {start, skill, task?, label, mix?, paused?, off?, since?, nudged?}
// paused: when the current break began; off: ms spent in finished breaks;
// since: when the current stretch of study began; nudged: the stretch the rest reminder already fired for.
const KEY = "nb:timer";
export const REST_AFTER = 50 * 60000;
let cur = null;
try { cur = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e){ cur = null; }

const subs = new Set();
export const onTimer = fn => subs.add(fn);
const emit = () => subs.forEach(fn => fn(cur));
const save = () => { try { if (cur) localStorage.setItem(KEY, JSON.stringify(cur)); else localStorage.removeItem(KEY); } catch (e){} };

export const running = () => cur;
// study time so far, breaks left out
export const elapsed = t => (t.paused || Date.now()) - t.start - (t.off || 0);
// how long the current stretch has gone without a break
export const stretch = t => t.paused ? 0 : Date.now() - (t.since || t.start);
export function start(opts){
  const now = Date.now();
  cur = Object.assign({start: now, since: now}, opts);
  save();
  emit();
}
export function pause(){
  if (!cur || cur.paused) return;
  cur.paused = Date.now();
  save();
  emit();
}
export function resume(){
  if (!cur || !cur.paused) return;
  const now = Date.now();
  cur.off = (cur.off || 0) + now - cur.paused;
  cur.paused = null;
  cur.since = now;
  save();
  emit();
}
export function markNudged(){ if (cur){ cur.nudged = cur.since || cur.start; save(); } }
export function stop(){
  const t = cur;
  cur = null;
  save();
  emit();
  return t ? Object.assign({}, t, {min: Math.round(elapsed(t) / 60000)}) : null;
}
export function cancel(){ cur = null; save(); emit(); }
export function fmtClock(ms){ const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); return (h ? h + ":" : "") + String(Math.floor(s / 60) % 60).padStart(h ? 2 : 1, "0") + ":" + String(s % 60).padStart(2, "0"); }
