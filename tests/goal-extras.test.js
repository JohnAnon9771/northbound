import { test } from "node:test";
import assert from "node:assert/strict";
import { BASE_MIN, extraPlanFor, buildExtras, splitFor } from "../js/domain/goal-extras.js";
import { WEEK_SPLIT } from "../js/data/skills.js";
import { LINKS } from "../js/data/lessons.js";

const byKey = (ts, k) => ts.find(t => t.k === k);

test("hours above the base route split two thirds reading, one third conversation", () => {
  assert.equal(BASE_MIN, 810);
  assert.deepEqual(extraPlanFor(13.5), {extra: 0, ext: 0, conv: 0});
  assert.deepEqual(extraPlanFor(10), {extra: 0, ext: 0, conv: 0});
  assert.deepEqual(extraPlanFor(18), {extra: 270, ext: 180, conv: 90});
  // less than 30 min of conversation goes to reading
  assert.deepEqual(extraPlanFor(14), {extra: 30, ext: 30, conv: 0});
});

test("no extras at or below the base route", () => {
  assert.deepEqual(buildExtras(5, 13.5), []);
});

test("a regular early week: e-Reader book, News in Levels and extra conversation", () => {
  const x = buildExtras(2, 18);
  assert.deepEqual(x.map(t => t.k), ["x2-eer", "x2-nil", "x2-cv"]);
  assert.equal(byKey(x, "x2-nil").m, 60);
  assert.equal(byKey(x, "x2-nil").u, LINKS.nil2);
  assert.equal(byKey(x, "x2-eer").m, 120);
  assert.deepEqual(byKey(x, "x2-eer").mix, [["read", 60], ["list", 60]]);
  assert.equal(byKey(x, "x2-cv").m, 90);
  assert.ok(x.every(t => t.x));
});

test("week 1 starts with the level quiz and has no extra conversation", () => {
  const x = buildExtras(1, 18);
  assert.equal(byKey(x, "x1-eer").u, LINKS.eerQuiz);
  assert.ok(!byKey(x, "x1-cv"));
});

test("light weeks halve the reading and drop news and conversation", () => {
  const x = buildExtras(13, 18);   // soft week after the A2+ checkpoint
  assert.deepEqual(x.map(t => t.k), ["x13-eer"]);
  assert.equal(x[0].m, 90);
});

test("News in Levels moves to level 3 after week 12 and stops after week 26", () => {
  assert.equal(byKey(buildExtras(14, 18), "x14-nil").u, LINKS.nil3);
  const x30 = buildExtras(30, 18);
  assert.ok(!byKey(x30, "x30-nil"));
  assert.equal(byKey(x30, "x30-eer").m, 180);
  assert.match(byKey(buildExtras(53, 18), "x53-eer").n, /^Quando o upper-intermediate/);
});

test("weekly split scales below the base route and adds the extras above it", () => {
  assert.deepEqual(splitFor(13.5, false), WEEK_SPLIT.map(s => [s[0], s[1], s[2]]));
  assert.deepEqual(splitFor(6.75, false).map(r => r[2]), WEEK_SPLIT.map(s => s[2] / 2));
  const apart = splitFor(18, false);
  assert.equal(apart.length, WEEK_SPLIT.length + 2);
  assert.deepEqual(apart.slice(-2).map(r => [r[0], r[2]]), [["read", 180], ["conv", 90]]);
  const merged = splitFor(18, true);
  const row = id => merged.find(r => r[0] === id);
  const base = id => WEEK_SPLIT.find(s => s[0] === id)[2];
  assert.equal(row("read")[2], base("read") + 90);
  assert.equal(row("list")[2], base("list") + 90);
  assert.equal(row("conv")[2], base("conv") + 90);
  assert.equal(row("read")[1], "Reading e livros");
});
