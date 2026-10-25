// One running study timer, kept in localStorage so it survives reloads.
// {start, skill, task?, label, mix?}
const KEY = "nb:timer";
let cur = null;
try { cur = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e){ cur = null; }

const subs = new Set();
export const onTimer = fn => subs.add(fn);
const emit = () => subs.forEach(fn => fn(cur));

export const running = () => cur;
export function start(opts){
  cur = Object.assign({start: Date.now()}, opts);
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e){}
  emit();
}
export function stop(){
  const t = cur;
  cur = null;
  try { localStorage.removeItem(KEY); } catch (e){}
  emit();
  return t ? Object.assign({}, t, {min: Math.round((Date.now() - t.start) / 60000)}) : null;
}
export function cancel(){ cur = null; try { localStorage.removeItem(KEY); } catch (e){} emit(); }
export function fmtClock(ms){ const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); return (h ? h + ":" : "") + String(Math.floor(s / 60) % 60).padStart(h ? 2 : 1, "0") + ":" + String(s % 60).padStart(2, "0"); }
