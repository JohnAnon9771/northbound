// SM-2 scheduler in the style of Anki. Pure functions: pass `now` (ms) and an optional rng.
// Card SRS fields live on the card itself: state, due, interval (days), ease, reps, lapses, step, last.
import { DAY_MS, startOfDay, endOfDay } from "../core/date.js";

export const LEARN_STEPS = [1, 10];   // minutes
export const RELEARN_STEPS = [10];
export const GRAD_IVL = 1, EASY_IVL = 4, START_EASE = 2.5, MIN_EASE = 1.3, MAX_IVL = 3650;
export const LAPSE_KEEP = 0.3;        // share of the old interval kept after forgetting
export const LEARN_AHEAD_MIN = 20;
export const GRADES = {AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4};

export function newSrs(now){ return {state: "new", due: now, interval: 0, ease: START_EASE, reps: 0, lapses: 0, step: 0, last: null}; }

// midnight of the day `days` after now, so a card is available for that whole day
export function dayDue(now, days){ const d = new Date(startOfDay(now)); d.setDate(d.getDate() + days); return d.getTime(); }
const minDue = (now, min) => now + Math.round(min * 60000);

function fuzz(ivl, rng){
  if (ivl < 3) return ivl;
  const spread = Math.max(1, Math.round(ivl * 0.05));
  return ivl + Math.round((rng() * 2 - 1) * spread);
}

export function schedule(card, grade, now, rng){
  const r = rng || Math.random;
  const c = {state: card.state || "new", interval: card.interval || 0, ease: card.ease || START_EASE, reps: card.reps || 0, lapses: card.lapses || 0, step: card.step || 0};
  const out = {reps: c.reps + 1, last: now, ease: c.ease, lapses: c.lapses, interval: c.interval};

  if (c.state === "review"){
    if (grade === GRADES.AGAIN){
      return Object.assign(out, {state: "relearning", step: 0, lapses: c.lapses + 1, ease: Math.max(MIN_EASE, c.ease - 0.2),
        interval: Math.max(1, Math.round(c.interval * LAPSE_KEEP)), due: minDue(now, RELEARN_STEPS[0])});
    }
    let ivl, ease = c.ease;
    if (grade === GRADES.HARD){ ivl = Math.max(c.interval + 1, Math.round(c.interval * 1.2)); ease = Math.max(MIN_EASE, ease - 0.15); }
    else if (grade === GRADES.GOOD){ ivl = Math.max(c.interval + 1, Math.round(c.interval * ease)); }
    else { ivl = Math.max(c.interval + 2, Math.round(c.interval * ease * 1.3)); ease = ease + 0.15; }
    ivl = Math.min(MAX_IVL, fuzz(ivl, r));
    return Object.assign(out, {state: "review", step: 0, ease, interval: ivl, due: dayDue(now, ivl)});
  }

  // new, learning or relearning: walk the steps
  const relearn = c.state === "relearning";
  const steps = relearn ? RELEARN_STEPS : LEARN_STEPS;
  const next = relearn ? "relearning" : "learning";
  const graduate = ivl => Object.assign(out, {state: "review", step: 0, interval: ivl, due: dayDue(now, ivl)});
  if (grade === GRADES.AGAIN) return Object.assign(out, {state: next, step: 0, due: minDue(now, steps[0])});
  if (grade === GRADES.HARD){
    const s = Math.min(c.step, steps.length - 1);
    const delay = s === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[s];
    return Object.assign(out, {state: next, step: s, due: minDue(now, delay)});
  }
  if (grade === GRADES.GOOD){
    const s = c.state === "new" ? 1 : c.step + 1;
    if (s >= steps.length) return graduate(relearn ? Math.max(1, c.interval) : GRAD_IVL);
    return Object.assign(out, {state: next, step: s, due: minDue(now, steps[s])});
  }
  return graduate(relearn ? Math.max(1, c.interval) + 1 : EASY_IVL);
}

export function fmtIvl(ms){
  const min = Math.round(ms / 60000);
  if (min < 60) return "<" + Math.max(1, min) + " min";
  const days = Math.round(ms / DAY_MS);
  if (days < 1) return Math.round(min / 60) + " h";
  if (days < 30) return days + " d";
  if (days < 365) return (days / 30).toLocaleString("pt-BR", {maximumFractionDigits: 1}) + " m";
  return (days / 365).toLocaleString("pt-BR", {maximumFractionDigits: 1}) + " a";
}
// labels for the four answer buttons ("<1 min", "1 d", "4 d"...)
export function preview(card, now){
  const out = {};
  [1, 2, 3, 4].forEach(g => {
    const s = schedule(card, g, now, () => 0.5);
    out[g] = s.state === "review" ? (s.interval < 30 ? s.interval + " d" : fmtIvl(s.interval * DAY_MS)) : fmtIvl(s.due - now);
  });
  return out;
}

const isLearning = c => c.state === "learning" || c.state === "relearning";
/* Today's queue: learning cards (with a short learn-ahead window), then reviews due today,
   then new cards up to the daily limit. Reviews always come before new cards. */
export function buildQueue(cards, now, newLeft){
  const eod = endOfDay(now);
  const active = cards.filter(c => !c.suspended);
  const learning = active.filter(c => isLearning(c) && c.due <= now + LEARN_AHEAD_MIN * 60000).sort((a, b) => a.due - b.due);
  const review = active.filter(c => c.state === "review" && c.due <= eod).sort((a, b) => a.due - b.due);
  const fresh = active.filter(c => c.state === "new").sort((a, b) => (a.created || 0) - (b.created || 0)).slice(0, Math.max(0, newLeft));
  return {learning, review, fresh};
}
