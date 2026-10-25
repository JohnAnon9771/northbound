import { test } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, newlyUnlocked } from "../js/domain/achievements.js";

test("achievements unlock once", () => {
  const ctx = {cards: 3, known: 0, streak: 8, hours: 2, weeksDone: 0, week: 1, efBest: 0, longestConv: 0, reviews: 10};
  assert.deepEqual(newlyUnlocked(ctx, {}).map(a => a.id), ["first-card", "streak-7"]);
  assert.deepEqual(newlyUnlocked(ctx, {"first-card": "x"}).map(a => a.id), ["streak-7"]);
});

test("every achievement unlocks at its threshold", () => {
  const max = {cards: 1, known: 2000, streak: 100, hours: 450, weeksDone: 1, week: 53, efBest: 61, longestConv: 20, reviews: 1000};
  assert.equal(newlyUnlocked(max, {}).length, ACHIEVEMENTS.length);
  const zero = {cards: 0, known: 0, streak: 0, hours: 0, weeksDone: 0, week: 1, efBest: 0, longestConv: 0, reviews: 0};
  assert.deepEqual(newlyUnlocked(zero, {}), []);
});
