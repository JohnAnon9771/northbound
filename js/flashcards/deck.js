// Deck operations on top of the store: create, edit, answer, and today's numbers.
import { S, putCard, putCards, deleteCard, addReview, cardById } from "../core/store.js";
import { uid } from "../core/id.js";
import { today } from "../core/date.js";
import { newSrs, schedule, buildQueue } from "./srs.js";
import { reviewMsOn, newIntroducedOn, knownCount } from "../domain/stats.js";
import { phaseNow } from "../domain/route.js";

export const REVIEW_CAP_MS = 15 * 60000;   // past this, no new cards today
export const SEC_PER_CARD = 9;

const CONTENT = ["term", "ipa", "audio", "pos", "translation", "definition", "examples", "collocations", "cefr", "notes", "context", "tags"];
const pick = o => { const x = {}; CONTENT.forEach(k => { if (o[k] !== undefined) x[k] = o[k]; }); return x; };

export function findByTerm(term){ const t = term.trim().toLowerCase(); return S.cards.find(c => c.dir !== "rev" && c.term.toLowerCase() === t); }

// fields: enrichment + context; opts: {reverse, source}
export function addCard(fields, opts){
  const o = opts || {};
  const now = Date.now();
  const base = Object.assign({examples: [], collocations: [], tags: []}, pick(fields), {source: o.source || "manual", created: now});
  const card = Object.assign({id: uid()}, base, newSrs(now));
  const out = [card];
  if (o.reverse) out.push(Object.assign({id: uid(), dir: "rev", parent: card.id}, base, newSrs(now), {created: now + 1}));
  putCards(out);
  return card;
}

export function updateCard(id, fields){
  const c = cardById(id);
  if (!c) return;
  const content = pick(fields);
  putCard(Object.assign({}, c, content));
  // keep the reverse twin in sync
  S.cards.filter(x => x.parent === id).forEach(r => putCard(Object.assign({}, r, content), true));
}
export function setReverse(id, on){
  const c = cardById(id), twin = S.cards.find(x => x.parent === id);
  if (on && !twin) putCard(Object.assign({}, c, newSrs(Date.now()), {id: uid(), dir: "rev", parent: id, created: Date.now()}));
  if (!on && twin) deleteCard(twin.id);
}
export function removeCard(id){
  const twins = S.cards.filter(x => x.parent === id);
  const c = deleteCard(id);
  twins.forEach(t => deleteCard(t.id));
  return c ? [c].concat(twins) : [];
}
export const restoreCards = cards => putCards(cards);
export const twinOf = id => S.cards.find(x => x.parent === id);

export function answer(card, grade, ms){
  const now = Date.now();
  const next = schedule(card, grade, now);
  addReview({cardId: card.id, date: today(), ts: now, grade, prev: card.state || "new", ivl: next.interval, ms: Math.round(ms || 0)});
  return putCard(Object.assign({}, card, next), true);
}

export function newLimit(){
  const own = S.state.settings.newPerDay;
  return own == null ? phaseNow().newPerDay : own;
}

/* Today's numbers for Hoje, Palavras and the study screen. */
export function deckToday(){
  const now = Date.now(), t = today();
  const reviewMs = reviewMsOn(S.reviews, t);
  const introduced = newIntroducedOn(S.reviews, t);
  const blocked = reviewMs > REVIEW_CAP_MS;
  const limit = newLimit();
  const left = blocked ? 0 : Math.max(0, limit - introduced);
  const q = buildQueue(S.cards, now, left);
  const due = q.learning.length + q.review.length;
  const fronts = S.cards.filter(c => c.dir !== "rev");
  return {
    due, fresh: q.fresh.length, queue: q, limit, introduced, blocked, reviewMs,
    minutes: Math.max(1, Math.round((due + q.fresh.length * 2) * SEC_PER_CARD / 60)),
    total: fronts.length, known: knownCount(S.cards),
    newWaiting: fronts.filter(c => c.state === "new").length,
    reviewedToday: S.reviews.filter(r => r.date === t).length
  };
}

// card that has a nice example for "Frase do dia": stable for the whole day
export function phraseOfDay(){
  const pool = S.cards.filter(c => c.dir !== "rev" && c.examples && c.examples.some(e => e.en && e.pt));
  if (!pool.length) return null;
  const t = today();
  let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const learned = pool.filter(c => c.state !== "new");
  const from = learned.length ? learned : pool;
  const c = from[h % from.length];
  const ex = c.examples.filter(e => e.en && e.pt);
  return {card: c, ex: ex[h % ex.length]};
}
