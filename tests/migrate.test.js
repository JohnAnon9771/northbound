import { test } from "node:test";
import assert from "node:assert/strict";
import { fromBackup, normalizeState, blankState } from "../js/core/migrate.js";

const v1 = {
  settings: {start: "2026-09-07", goalH: 16, targetWeeks: 48},
  done: {"w1-diag": "2026-09-08"}, skip: {3: true}, cando: {"a2-l": 2},
  errors: [{id: "e1", wrong: "I have 30 years", right: "I'm 30", count: 3}],
  tests: [{id: "t1", type: "efset", date: "2026-09-08", score: "38", level: "A2"}],
  scores: {GA1: [{k: "w2-GA1", d: "2026-09-15", p: 72}, {k: "bad", d: "x", p: 50}]},
  logs: {
    "2026-09": [{id: "l1", date: "2026-09-08", min: 45, skill: "duo", note: "DuoCards"}, {id: "l2", date: "2026-09-10", min: 0, skill: "list"}],
    "2026-10": [{id: "l3", date: "2026-10-20", min: 90, skill: "gram"}]
  }
};

test("v1 backup: flattens monthly logs, drops empty ones and renames DuoCards to cards", () => {
  const d = fromBackup(v1);
  assert.deepEqual(d.logs.map(l => [l.id, l.skill, l.min]), [["l1", "cards", 45], ["l3", "gram", 90]]);
  assert.equal(d.cards.length, 0);
  assert.equal(d.state.settings.goalH, 16);
  assert.equal(d.state.settings.targetWeeks, 48);
  assert.equal(d.state.settings.claudeModel, "claude-haiku-5-5");
  assert.equal(d.state.errors[0].count, 3);
  assert.deepEqual(d.state.scores, {GA1: [{k: "w2-GA1", d: "2026-09-15", p: 72}]});
});

test("own backup round-trips cards and reviews", () => {
  const card = {id: "c1", term: "bank", translation: "banco", state: "review", due: 1, interval: 3};
  const d = fromBackup({app: "northbound", v: 2, state: blankState(), logs: [{id: "a", date: "2026-10-01", min: 10, skill: "cards"}], cards: [card, {id: "x"}], reviews: [{cardId: "c1", grade: 3}, {}]});
  assert.deepEqual(d.cards, [card]);
  assert.equal(d.reviews.length, 1);
  assert.equal(d.logs.length, 1);
});

test("garbage is rejected", () => {
  assert.throws(() => fromBackup(null));
  assert.throws(() => fromBackup({hello: 1}));
});

test("settings are clamped to valid values", () => {
  const s = normalizeState({settings: {start: "nope", goalH: 99, targetWeeks: 10, accent: "fr", newPerDay: "12", claudeModel: "gpt"}}).settings;
  assert.match(s.start, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(s.goalH, 30);
  assert.equal(s.targetWeeks, 52);
  assert.equal(s.accent, "en-GB");
  assert.equal(s.newPerDay, 12);
  assert.equal(s.claudeModel, "claude-haiku-5-5");
});
