import { test } from "node:test";
import assert from "node:assert/strict";
import { fromBackup, toBackup } from "../js/state/backup-format.js";
import { normalizeState, normalizeLog, blankState } from "../js/state/schema.js";

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

test("normalizeState drops malformed fields and keeps valid ones", () => {
  const s = normalizeState({
    settings: {goalH: "2", targetWeeks: "44", accent: "en-US", newPerDay: "", mmEmail: "  a@b.co ", claudeModel: "claude-opus-5-5"},
    errors: [{id: "e1", wrong: "x"}, {wrong: "no id"}, null], tests: "nope",
    scores: {GA01: "x", GA02: [{k: "w2", d: "2026-10-01", p: 101}, {k: "w3", d: "2026-10-08", p: "79.6"}]},
    revFrom: 1000, dayPlan: {date: "2026-10-25", keys: "GA01"}, achievements: {"week-1": "2026-10-01"}, lastBackup: 5
  });
  assert.equal(s.settings.goalH, 4);
  assert.equal(s.settings.targetWeeks, 44);
  assert.equal(s.settings.accent, "en-US");
  assert.equal(s.settings.newPerDay, null);
  assert.equal(s.settings.mmEmail, "a@b.co");
  assert.equal(s.settings.claudeModel, "claude-opus-5-5");
  assert.deepEqual(s.errors.map(e => e.id), ["e1"]);
  assert.deepEqual(s.tests, []);
  assert.deepEqual(s.scores, {GA02: [{k: "w3", d: "2026-10-08", p: 80}]});
  assert.equal(s.revFrom, null);
  assert.equal(s.dayPlan, null);
  assert.deepEqual(s.achievements, {"week-1": "2026-10-01"});
  assert.equal(s.lastBackup, null);
  assert.equal(normalizeState({revFrom: "7.8"}).revFrom, 7);
  assert.deepEqual(normalizeState({dayPlan: {date: "2026-10-25", keys: [1, "a"]}}).dayPlan, {date: "2026-10-25", keys: ["1", "a"]});
});

test("normalizeLog validates date and minutes and gives an id", () => {
  assert.equal(normalizeLog({date: "2026-10-01", min: 0}), null);
  assert.equal(normalizeLog({date: "ontem", min: 10}), null);
  const l = normalizeLog({date: "2026-10-01", min: "12.4", skill: "duo", task: 7});
  assert.equal(l.min, 12);
  assert.equal(l.skill, "cards");
  assert.equal(l.task, "7");
  assert.ok(l.id);
  assert.equal(normalizeLog({date: "2026-10-01", min: 5}).skill, "gram");
});

test("backup written by toBackup restores to the same data", () => {
  const data = {
    state: normalizeState({settings: {goalH: 20}, done: {GA01: "2026-10-01"}, revFrom: 3}),
    logs: [{id: "a", date: "2026-10-01", min: 30, skill: "list", note: "pod", ts: 5}],
    cards: [{id: "c1", term: "bank"}], reviews: [{id: "r1", cardId: "c1", grade: 3}]
  };
  const file = JSON.parse(JSON.stringify(toBackup(data)));
  assert.equal(file.app, "northbound");
  assert.deepEqual(fromBackup(file), data);
});

test("Diário entries survive a backup round-trip and bad ones are dropped", () => {
  const st = blankState();
  st.feedback = [{id: "f1", kind: "conv", date: "2026-10-20", task: "w2-conv", min: 30, feel: 4, level: "A2+", crit: {flu: 3}, errs: [{wrong: "I go yesterday", right: "I went yesterday"}], ts: 1}, {kind: "conv", date: "x"}];
  const d = fromBackup(JSON.parse(JSON.stringify(toBackup({state: st, logs: [], cards: [], reviews: []}))));
  assert.equal(d.state.feedback.length, 1);
  assert.deepEqual(d.state.feedback[0].crit, {flu: 3});
  assert.equal(d.state.feedback[0].task, "w2-conv");
  assert.deepEqual(normalizeState({}).feedback, []);
});
