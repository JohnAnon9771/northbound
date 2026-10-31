import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWeek } from "../js/domain/week-tasks.js";
import { WEEKS } from "../js/data/weeks.js";
import { LESSONS } from "../js/data/lessons.js";
import { skillOf } from "../js/data/skills.js";

const NEW = {revFrom: 1, skip: {}};      // the current task lists
const OLD = {revFrom: 999, skip: {}};    // weeks counted before the review upgrade
const keys = ts => ts.map(t => t.k);
const byKey = (ts, k) => ts.find(t => t.k === k);
const gramOf = n => WEEKS[n].items.filter(i => typeof i === "string" && LESSONS[i].s === "gram");

test("task keys are unique in every week", () => {
  [NEW, OLD, {revFrom: 1, skip: {5: true}}].forEach(route => {
    for (let n = 1; n <= 66; n++){
      const k = keys(buildWeek(n, route));
      assert.equal(new Set(k).size, k.length, "week " + n);
    }
  });
});

test("week 1 is only the diagnosis, with no standard tasks", () => {
  const w = buildWeek(1, NEW);
  assert.equal(w.length, WEEKS[1].items.length);
  assert.ok(!keys(w).some(k => k.endsWith("-in") || k.endsWith("-er")));
});

test("lesson ids become lesson tasks and the conversation theme becomes a task", () => {
  const w = buildWeek(2, NEW);
  WEEKS[2].items.forEach(id => assert.equal(byKey(w, id).t, LESSONS[id].t));
  assert.match(byKey(w, "w2-conv").t, /^ChatGPT: /);
});

test("conversation tasks count Diário sessions against the phase goal; writing lessons take a correction", () => {
  assert.deepEqual(byKey(buildWeek(2, NEW), "w2-conv").fb, {kind: "conv", n: 3});
  assert.deepEqual(byKey(buildWeek(30, NEW), "w30-conv").fb, {kind: "conv", n: 4});
  assert.deepEqual(byKey(buildWeek(1, NEW), "w1-gpt").fb, {kind: "conv", n: 1});
  assert.deepEqual(byKey(buildWeek(2, NEW), "WA01").fb, {kind: "writ"});
  assert.equal(byKey(buildWeek(2, NEW), "GA01").fb, undefined);
  assert.equal(byKey(buildWeek(53, NEW), "c53-cv").fb.kind, "conv");
});

test("spaced reviews: last week's grammar after 7 days and a new test after 4 weeks", () => {
  const w6 = buildWeek(6, NEW);
  assert.deepEqual(byKey(w6, "w6-rt").sc, gramOf(5));
  assert.deepEqual(byKey(w6, "w6-rt4").sc, gramOf(2));
  assert.ok(byKey(w6, "w6-rl"));
  assert.ok(byKey(w6, "w6-er"));
});

test("skipped weeks are not reviewed: the reviews look further back", () => {
  const w7 = buildWeek(7, {revFrom: 1, skip: {5: true, 6: true}});
  assert.deepEqual(byKey(w7, "w7-rt").sc, gramOf(4));
  assert.ok(!byKey(w7, "w7-rt4"));   // 4 study weeks back is week 1, the diagnosis, which has no lessons
  assert.deepEqual(byKey(buildWeek(8, {revFrom: 1, skip: {5: true, 6: true}}), "w8-rt4").sc, gramOf(2));
});

test("block weeks skip the 4-week retest, err weeks skip the error drill", () => {
  const n = Object.keys(WEEKS).map(Number).find(m => WEEKS[m].block && WEEKS[m].err && m > 5);
  const w = buildWeek(n, NEW);
  assert.ok(!byKey(w, "w" + n + "-rt4"));
  assert.ok(!byKey(w, "w" + n + "-er"));
});

test("weeks before revFrom keep the old list: 7-day retest only and 70 min of free input", () => {
  const w = buildWeek(3, OLD);
  assert.deepEqual(byKey(w, "w3-rt").sc, gramOf(2));
  assert.ok(!byKey(w, "w3-rl") && !byKey(w, "w3-er") && !byKey(w, "w3-rt4"));
  assert.equal(byKey(w, "w3-in").m, 70);
});

test("regular weeks keep at least 4 h of input; light weeks only 70 min of free input", () => {
  for (let n = 2; n <= 52; n++){
    const d = WEEKS[n];
    if (d.noStd) continue;
    const w = buildWeek(n, NEW);
    const inMin = w.filter(t => skillOf(t.s).c === "in").reduce((a, t) => a + t.m, 0);
    if (d.light || d.soft) assert.equal(byKey(w, "w" + n + "-in").m, 70, "week " + n);
    else assert.ok(inMin >= 240, "week " + n + ": " + inMin);
  }
});

test("soft and noExtras weeks have no phase extras", () => {
  for (let n = 2; n <= 52; n++){
    if (!WEEKS[n].noExtras && !WEEKS[n].soft) continue;
    assert.ok(!buildWeek(n, NEW).some(t => t.vol && !t.k.endsWith("-in")), "week " + n);
  }
});

test("checkpoints add milestone tasks", () => {
  const w4 = buildWeek(4, NEW);
  assert.ok(byKey(w4, "w4-bc").ms && byKey(w4, "w4-wi").ms);
  const n = Object.keys(WEEKS).map(Number).find(m => (WEEKS[m].ms || []).some(x => x.startsWith("ef:")) && (WEEKS[m].ms || []).some(x => x.startsWith("cd:")));
  const w = buildWeek(n, NEW);
  const ef = WEEKS[n].ms.find(x => x.startsWith("ef:")).slice(3);
  assert.equal(byKey(w, "w" + n + "-ef").t, "EF SET 50 min, meta " + ef);
  assert.match(byKey(w, "w" + n + "-cd").t, /can-do/);
});

test("after week 52: the C1 weekly model, with an EF SET every 12 weeks", () => {
  const w53 = buildWeek(53, NEW);
  assert.ok(keys(w53).every(k => k.startsWith("c53-")));
  assert.ok(!byKey(w53, "c53-ef"));
  assert.ok(byKey(buildWeek(64, NEW), "c64-ef").ms);
});
