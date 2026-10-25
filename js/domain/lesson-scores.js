// Lesson scores, one entry per task: scores[lessonId] = [{k: task key, d: date, p: percent}] (S.state.scores).
import { today } from "../core/date.js";

export function scoreFor(scores, id, k){ const e = (scores[id] || []).find(x => x.k === k); return e ? e.p : null; }
export function latestScore(scores, id, exceptK){ let best = null; (scores[id] || []).forEach(e => { if (exceptK && e.k === exceptK) return; if (!best || e.d >= best.d) best = e; }); return best; }
export function setScore(scores, id, k, p, date){
  const arr = (scores[id] || []).filter(e => e.k !== k);
  if (p != null) arr.push({k, d: date || today(), p});
  if (arr.length) scores[id] = arr; else delete scores[id];
}
// lessons whose latest score is under 80% (lowest first), and the ones with no score yet
export function lowLessons(scores, ids){
  const low = [], none = [];
  ids.forEach(id => { const e = latestScore(scores, id); if (!e) none.push(id); else if (e.p < 80) low.push([id, e.p]); });
  low.sort((a, b) => a[1] - b[1]);
  return {low, none};
}
