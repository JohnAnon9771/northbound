import { test } from "node:test";
import assert from "node:assert/strict";
import { deckSummary, pickPhrase, addCard, updateCard, setReverse, removeCard, restoreCards, twinOf, answer, findByTerm, newLimit, deckToday, REVIEW_CAP_MS } from "../js/flashcards/deck.js";
import { isFront, pickContent, CONTENT_FIELDS } from "../js/flashcards/card.js";
import { newSrs, GRADES } from "../js/flashcards/srs.js";
import { S, update } from "../js/state/store.js";
import { PHASES } from "../js/data/phases.js";

const NOW = new Date(2026, 9, 25, 10, 0).getTime();
const TODAY = "2026-10-25";
const card = (id, extra) => Object.assign({id, term: id, created: 1}, newSrs(NOW - 1), extra || {});

test("card helpers", () => {
  assert.equal(isFront({}), true);
  assert.equal(isFront({dir: "rev"}), false);
  assert.deepEqual(pickContent({term: "a", state: "new", due: 1, notes: ""}), {term: "a", notes: ""});
  assert.ok(CONTENT_FIELDS.includes("examples"));
});

test("summary: due cards, new cards up to what's left of the limit, reverse twins out of the totals", () => {
  const cards = [card("n1"), card("n2"), card("n3"), card("r1", {state: "review", interval: 3, due: NOW - 1}), card("t1", {dir: "rev", parent: "n1"})];
  const reviews = [{date: TODAY, cardId: "x", prev: "new", ms: 1000}];
  const d = deckSummary({cards, reviews, now: NOW, todayISO: TODAY, limit: 3});
  assert.equal(d.due, 1);
  assert.equal(d.introduced, 1);
  assert.equal(d.fresh, 2);
  assert.equal(d.total, 4);
  assert.equal(d.newWaiting, 3);
  assert.equal(d.reviewedToday, 1);
  assert.equal(d.blocked, false);
  assert.equal(d.minutes, Math.max(1, Math.round((1 + 2 * 2) * 9 / 60)));
});

test("summary: more than 15 min of reviews blocks new cards for the day", () => {
  const reviews = Array.from({length: 16}, (_, i) => ({date: TODAY, cardId: "r" + i, prev: "review", ms: 60000}));
  const d = deckSummary({cards: [card("n1")], reviews, now: NOW, todayISO: TODAY, limit: 10});
  assert.ok(d.reviewMs > REVIEW_CAP_MS);
  assert.equal(d.blocked, true);
  assert.equal(d.fresh, 0);
});

test("phrase of the day: stable for the day, learned cards first, null without translated examples", () => {
  assert.equal(pickPhrase([card("a", {examples: [{en: "x", pt: ""}]})], TODAY), null);
  const cards = [
    card("new", {examples: [{en: "A new one.", pt: "Uma nova."}]}),
    card("seen", {state: "review", examples: [{en: "Seen it.", pt: "Já vi."}, {en: "No pt."}]}),
    card("rev", {dir: "rev", state: "review", examples: [{en: "Twin.", pt: "Gêmeo."}]})
  ];
  const p = pickPhrase(cards, TODAY);
  assert.equal(p.card.id, "seen");
  assert.deepEqual(p.ex, {en: "Seen it.", pt: "Já vi."});
  assert.deepEqual(pickPhrase(cards, TODAY), p);
  assert.equal(pickPhrase([cards[0]], "2026-10-26").card.id, "new");
});

test("with the store: add with a reverse twin, edit both, toggle and remove", () => {
  const c = addCard({term: "look forward to", translation: "aguardar", state: "review", examples: [{en: "I look forward to it.", pt: ""}]}, {reverse: true, source: "lista"});
  assert.equal(c.state, "new");                       // SRS fields never come from the fields
  assert.equal(c.source, "lista");
  assert.equal(twinOf(c.id).dir, "rev");
  assert.equal(findByTerm("  Look Forward To "), c);
  updateCard(c.id, {translation: "ansiar por"});
  assert.equal(twinOf(c.id).translation, "ansiar por");
  setReverse(c.id, false);
  assert.equal(twinOf(c.id), undefined);
  setReverse(c.id, true);
  assert.ok(twinOf(c.id));
  const removed = removeCard(c.id);
  assert.equal(removed.length, 2);
  assert.equal(findByTerm("look forward to"), undefined);
  restoreCards(removed);
  assert.ok(findByTerm("look forward to"));
  assert.deepEqual(removeCard("nope"), []);
  updateCard("nope", {term: "x"});
});

test("with the store: answering schedules the card and records the review", () => {
  const c = addCard({term: "bank"});
  const before = S.reviews.length;
  const next = answer(c, GRADES.EASY, 4200);
  assert.equal(next.state, "review");
  assert.equal(next.interval, 4);
  const r = S.reviews[before];
  assert.deepEqual([r.cardId, r.grade, r.prev, r.ivl, r.ms], [c.id, 4, "new", 4, 4200]);
  assert.ok(deckToday().total >= 1);
});

test("with the store: daily new-card limit follows the phase unless set", () => {
  update(s => { s.settings.newPerDay = null; s.settings.start = TODAY; s.done = {}; s.skip = {}; });
  assert.equal(newLimit(), PHASES[0].newPerDay);
  update(s => { s.settings.newPerDay = 25; });
  assert.equal(newLimit(), 25);
});
