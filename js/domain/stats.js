// Pure stats over logs, cards and reviews (no store access, so they run under node --test).
import { addDays, mondayOf, parse } from "../core/date.js";
import { isFront } from "../flashcards/card.js";

export const KNOWN_IVL = 21;

export function minutesByDate(logs){
  const m = new Map();
  logs.forEach(e => m.set(e.date, (m.get(e.date) || 0) + e.min));
  return m;
}

/* Consecutive study days, where one missed day per Monday–Sunday week counts as a rest day
   and doesn't break the chain. Today only counts once you study; until then the chain runs to yesterday. */
export function streak(dayMap, todayISO){
  const dates = Array.from(dayMap.keys()).filter(d => dayMap.get(d) > 0).sort();
  const restThisWeek = restUsedInWeek(dayMap, todayISO);
  if (!dates.length) return {days: 0, restThisWeek, studiedToday: false};
  const first = dates[0];
  const rest = new Set();
  let d = dayMap.get(todayISO) > 0 ? todayISO : addDays(todayISO, -1);
  let days = 0;
  while (d >= first){
    if (dayMap.get(d) > 0) days++;
    else {
      const wk = mondayOf(parse(d));
      if (rest.has(wk)) break;
      rest.add(wk);
    }
    d = addDays(d, -1);
  }
  return {days, restThisWeek, studiedToday: dayMap.get(todayISO) > 0};
}
function restUsedInWeek(dayMap, todayISO){
  const mon = mondayOf(parse(todayISO));
  for (let d = mon; d < todayISO; d = addDays(d, 1)) if (!(dayMap.get(d) > 0)) return true;
  return false;
}

// weeks × 7 grid ending on the week of `endISO` (Monday first)
export function heatmap(dayMap, endISO, weeks){
  const start = addDays(mondayOf(parse(endISO)), -7 * (weeks - 1));
  const out = [];
  for (let w = 0; w < weeks; w++){
    const col = [];
    for (let i = 0; i < 7; i++){ const d = addDays(start, w * 7 + i); col.push({date: d, min: dayMap.get(d) || 0, future: d > endISO}); }
    out.push(col);
  }
  return out;
}
export const heatLevel = min => min <= 0 ? 0 : min < 20 ? 1 : min < 60 ? 2 : min < 120 ? 3 : 4;

export const knownCount = cards => cards.filter(c => isFront(c) && c.state === "review" && c.interval >= KNOWN_IVL).length;
export const learnedCount = cards => cards.filter(c => isFront(c) && c.state !== "new").length;

// cumulative "known words" per week: the first review that gave a card an interval ≥ 21 days
export function knownTimeline(reviews, cards, weeks, endISO){
  const fronts = new Set(cards.filter(isFront).map(c => c.id));
  const firstKnown = new Map();
  reviews.forEach(r => { if (fronts.has(r.cardId) && r.ivl >= KNOWN_IVL && !firstKnown.has(r.cardId)) firstKnown.set(r.cardId, r.date); });
  const end = mondayOf(parse(endISO));
  const points = [];
  for (let w = weeks - 1; w >= 0; w--){
    const wkEnd = addDays(end, -7 * w + 6);
    let n = 0; firstKnown.forEach(d => { if (d <= wkEnd) n++; });
    points.push({week: addDays(end, -7 * w), n});
  }
  return points;
}

export const newIntroducedOn = (reviews, dateISO) => new Set(reviews.filter(r => r.date === dateISO && r.prev === "new").map(r => r.cardId)).size;
export const reviewMsOn = (reviews, dateISO) => reviews.filter(r => r.date === dateISO && r.prev !== "new").reduce((a, r) => a + Math.min(r.ms || 0, 60000), 0);

// totals for one Monday–Sunday week
export function weekSummary({logs, reviews, done}, mondayISO){
  const sunday = addDays(mondayISO, 6);
  const inWeek = d => d >= mondayISO && d <= sunday;
  const min = logs.filter(e => inWeek(e.date)).reduce((a, e) => a + e.min, 0);
  const rv = reviews.filter(r => inWeek(r.date));
  const days = new Set(logs.filter(e => inWeek(e.date) && e.min > 0).map(e => e.date)).size;
  return {
    min, days,
    reviews: rv.length,
    newWords: new Set(rv.filter(r => r.prev === "new").map(r => r.cardId)).size,
    tasks: Object.keys(done).filter(k => inWeek(done[k])).length
  };
}
