import { test } from "node:test";
import assert from "node:assert/strict";
import { newSrs, schedule, buildQueue, dayDue, preview, GRADES } from "../js/flashcards/srs.js";

const NOW = new Date(2026, 9, 24, 10, 0).getTime();
const MIN = 60000;
const mid = () => 0.5;
const card = extra => Object.assign({id: "c", created: 1}, newSrs(NOW), extra || {});

test("new card: good goes to the 10-min step, good again graduates to 1 day", () => {
  const a = schedule(card(), GRADES.GOOD, NOW, mid);
  assert.equal(a.state, "learning");
  assert.equal(a.step, 1);
  assert.equal(a.due, NOW + 10 * MIN);
  const b = schedule(Object.assign(card(), a), GRADES.GOOD, a.due, mid);
  assert.equal(b.state, "review");
  assert.equal(b.interval, 1);
  assert.equal(b.due, dayDue(a.due, 1));
});

test("new card: easy graduates straight to 4 days, again restarts at 1 min", () => {
  assert.equal(schedule(card(), GRADES.EASY, NOW, mid).interval, 4);
  const again = schedule(card({state: "learning", step: 1}), GRADES.AGAIN, NOW, mid);
  assert.equal(again.step, 0);
  assert.equal(again.due, NOW + MIN);
});

test("review intervals grow with ease and never shrink on hard", () => {
  const c = card({state: "review", interval: 10, ease: 2.5, reps: 4});
  const good = schedule(c, GRADES.GOOD, NOW, mid);
  assert.equal(good.interval, 25);
  const hard = schedule(c, GRADES.HARD, NOW, mid);
  assert.equal(hard.interval, 12);
  assert.ok(hard.ease < 2.5);
  const easy = schedule(c, GRADES.EASY, NOW, mid);
  assert.ok(easy.interval > good.interval);
  assert.ok(easy.ease > 2.5);
});

test("lapse: relearning, ease drops, interval keeps 30%, then graduates back", () => {
  const c = card({state: "review", interval: 20, ease: 2.5, reps: 6});
  const lapse = schedule(c, GRADES.AGAIN, NOW, mid);
  assert.equal(lapse.state, "relearning");
  assert.equal(lapse.lapses, 1);
  assert.equal(lapse.interval, 6);
  assert.equal(lapse.ease, 2.3);
  assert.equal(lapse.due, NOW + 10 * MIN);
  const back = schedule(Object.assign({}, c, lapse), GRADES.GOOD, lapse.due, mid);
  assert.equal(back.state, "review");
  assert.equal(back.interval, 6);
});

test("ease never goes below 1.3", () => {
  let c = card({state: "review", interval: 5, ease: 1.35});
  c = Object.assign(c, schedule(c, GRADES.AGAIN, NOW, mid));
  assert.equal(c.ease, 1.3);
});

test("queue: learning first, reviews due today, new cards capped", () => {
  const cards = [
    card({id: "n1", created: 1}), card({id: "n2", created: 2}), card({id: "n3", created: 3}),
    card({id: "r1", state: "review", interval: 3, due: dayDue(NOW, 0)}),
    card({id: "r2", state: "review", interval: 3, due: dayDue(NOW, 1)}),
    card({id: "l1", state: "learning", step: 1, due: NOW + 5 * MIN}),
    card({id: "s1", suspended: true})
  ];
  const q = buildQueue(cards, NOW, 2);
  assert.deepEqual(q.learning.map(c => c.id), ["l1"]);
  assert.deepEqual(q.review.map(c => c.id), ["r1"]);
  assert.deepEqual(q.fresh.map(c => c.id), ["n1", "n2"]);
  assert.equal(buildQueue(cards, NOW, 0).fresh.length, 0);
});

test("preview labels", () => {
  const p = preview(card(), NOW);
  assert.equal(p[1], "<1 min");
  assert.equal(p[3], "<10 min");
  assert.equal(p[4], "4 d");
});
