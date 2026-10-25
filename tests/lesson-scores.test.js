import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreFor, latestScore, setScore, lowLessons } from "../js/domain/lesson-scores.js";
import { efLevel } from "../js/domain/efset.js";

test("one score per lesson and task: setting again replaces it, null removes it", () => {
  const scores = {};
  setScore(scores, "GA01", "GA01", 60, "2026-10-01");
  setScore(scores, "GA01", "w3-rt", 75, "2026-10-08");
  setScore(scores, "GA01", "w3-rt", 85, "2026-10-09");
  assert.equal(scoreFor(scores, "GA01", "w3-rt"), 85);
  assert.equal(scores.GA01.length, 2);
  assert.equal(scoreFor(scores, "GA01", "nope"), null);
  setScore(scores, "GA01", "GA01", null);
  setScore(scores, "GA01", "w3-rt", null);
  assert.deepEqual(scores, {});
});

test("latest score can leave out the current task", () => {
  const scores = {GA01: [{k: "GA01", d: "2026-10-01", p: 60}, {k: "w3-rt", d: "2026-10-08", p: 90}]};
  assert.equal(latestScore(scores, "GA01").p, 90);
  assert.equal(latestScore(scores, "GA01", "w3-rt").p, 60);
  assert.equal(latestScore(scores, "GA02"), null);
});

test("low lessons are under 80%, lowest first; lessons without a score are listed apart", () => {
  const scores = {A: [{k: "A", d: "2026-10-01", p: 70}], B: [{k: "B", d: "2026-10-01", p: 40}], C: [{k: "C", d: "2026-10-01", p: 80}]};
  assert.deepEqual(lowLessons(scores, ["A", "B", "C", "D"]), {low: [["B", 40], ["A", 70]], none: ["D"]});
});

test("EF SET score bands", () => {
  assert.deepEqual([20, 21, 30, 31, 40, 41, 50, 51, 60, 61, 70, 71].map(efLevel), ["pré-A1", "A1", "A1", "A2", "A2", "B1", "B1", "B2", "B2", "C1", "C1", "C2"]);
  assert.equal(efLevel("x"), "");
});
