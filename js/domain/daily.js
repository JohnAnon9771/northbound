/* Spreads the week's open tasks over the days left, so "Hoje" shows a short list instead of the whole week.
   Pure: give it the week's tasks, the done map, today, the week's Monday and minutes per date. */
import { addDays, daysBetween } from "../core/date.js";

const CAT = {gram: "base", vocab: "base", test: "base", cards: "base", list: "in", read: "in", input: "in", writ: "out", speak: "out", conv: "out"};

export function planDay({tasks, done, todayISO, mondayISO, dayMap, prev}){
  const open = tasks.filter(t => !done[t.k]);
  const doneToday = tasks.filter(t => done[t.k] === todayISO).map(t => t.k);
  if (prev && prev.date === todayISO){
    const keep = prev.keys.filter(k => tasks.some(t => t.k === k));
    return {keys: uniq(keep.concat(doneToday)), fresh: false};
  }
  const dayIdx = Math.max(0, Math.min(6, daysBetween(mondayISO, todayISO)));
  const daysLeft = 7 - dayIdx;
  let restUsed = false;
  for (let i = 0; i < dayIdx; i++) if (!(dayMap.get(addDays(mondayISO, i)) > 0)) restUsed = true;
  const studyDays = Math.max(1, daysLeft - (restUsed || daysLeft === 1 ? 0 : 1));
  const remaining = open.reduce((a, t) => a + (t.m || 0), 0);
  const target = Math.max(30, Math.ceil(remaining / studyDays));

  // one task per category first (variety), then fill in route order
  const picked = [];
  let sum = 0;
  const take = t => { picked.push(t.k); sum += t.m || 0; };
  ["base", "in", "out"].forEach(c => {
    if (sum >= target * 0.85) return;
    const t = open.find(x => (CAT[x.s] || "base") === c && !picked.includes(x.k) && !x.x);
    if (t) take(t);
  });
  open.forEach(t => { if (sum < target * 0.85 && !picked.includes(t.k)) take(t); });
  return {keys: uniq(picked.concat(doneToday)), fresh: true, target};
}

// next open task not yet in today's list (for "puxar mais uma")
export function nextOpen(tasks, done, keys){ return tasks.find(t => !done[t.k] && !keys.includes(t.k)) || null; }

const uniq = a => Array.from(new Set(a));
