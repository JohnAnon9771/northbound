// Deck operations on top of the store: create, edit, answer, and today's numbers.
import { S, putCard, putCards, deleteCard, addReview, cardById } from "../state/store.js";
import { uid } from "../core/id.js";
import { today } from "../core/date.js";
import { newSrs, schedule, buildQueue } from "./srs.js";
import { isFront, pickContent } from "./card.js";
import { reviewMsOn, newIntroducedOn, knownCount } from "../domain/stats.js";
import { phaseNow } from "../domain/pace.js";
import { lookupMeanings, refreshed, LIST_SRC } from "./meanings-list.js";

export const REVIEW_CAP_MS = 15 * 60000;   // past this, no new cards today
export const SEC_PER_CARD = 9;


export function findByTerm(term){ const t = term.trim().toLowerCase(); return S.cards.find(c => isFront(c) && c.term.toLowerCase() === t); }

// fields: enrichment + context; opts: {reverse, source}
export function addCard(fields, opts){
  const o = opts || {};
  const now = Date.now();
  const base = Object.assign({examples: [], collocations: [], tags: []}, pickContent(fields), {source: o.source || "manual", created: now});
  const card = Object.assign({id: uid()}, base, newSrs(now));
  const out = [card];
  if (o.reverse) out.push(Object.assign({id: uid(), dir: "rev", parent: card.id}, base, newSrs(now), {created: now + 1}));
  putCards(out);
  return card;
}

export function updateCard(id, fields){
  const c = cardById(id);
  if (!c) return;
  const content = pickContent(fields);
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

/* Cards made before the ready-made list (or from the free sources) take its content, once: the review history,
   your sentence, notes and tags stay. Returns how many words changed. */
export async function refreshFromList(){
  const changed = [];
  for (const c of S.cards.filter(c => isFront(c) && c.src !== LIST_SRC)){
    const entry = await lookupMeanings(c.term);
    if (!entry) continue;
    const card = refreshed(c, entry);
    changed.push(card);
    S.cards.filter(x => x.parent === c.id).forEach(r => changed.push(Object.assign({}, r, pickContent(card))));
  }
  if (changed.length) putCards(changed);
  return changed.filter(isFront).length;
}
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
export function deckSummary({cards, reviews, now, todayISO, limit}){
  const reviewMs = reviewMsOn(reviews, todayISO);
  const introduced = newIntroducedOn(reviews, todayISO);
  const blocked = reviewMs > REVIEW_CAP_MS;
  const left = blocked ? 0 : Math.max(0, limit - introduced);
  const q = buildQueue(cards, now, left);
  const due = q.learning.length + q.review.length;
  const fronts = cards.filter(isFront);
  return {
    due, fresh: q.fresh.length, queue: q, limit, introduced, blocked, reviewMs,
    minutes: Math.max(1, Math.round((due + q.fresh.length * 2) * SEC_PER_CARD / 60)),
    total: fronts.length, known: knownCount(cards),
    newWaiting: fronts.filter(c => c.state === "new").length,
    reviewedToday: reviews.filter(r => r.date === todayISO).length
  };
}
export const deckToday = () => deckSummary({cards: S.cards, reviews: S.reviews, now: Date.now(), todayISO: today(), limit: newLimit()});

// card with a translated example for "Frase do dia": stable for the whole day, learned cards first
export function pickPhrase(cards, todayISO){
  const pool = cards.filter(c => isFront(c) && c.examples && c.examples.some(e => e.en && e.pt));
  if (!pool.length) return null;
  let h = 0; for (const ch of todayISO) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const learned = pool.filter(c => c.state !== "new");
  const from = learned.length ? learned : pool;
  const c = from[h % from.length];
  const ex = c.examples.filter(e => e.en && e.pt);
  return {card: c, ex: ex[h % ex.length]};
}
export const phraseOfDay = () => pickPhrase(S.cards, today());
