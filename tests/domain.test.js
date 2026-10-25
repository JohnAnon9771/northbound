import { test } from "node:test";
import assert from "node:assert/strict";
import { streak, heatmap, weekSummary, knownCount } from "../js/domain/stats.js";
import { planDay } from "../js/domain/daily.js";
import { weekClosed } from "../js/domain/week-close.js";
import { newlyUnlocked } from "../js/domain/achievements.js";

const days = list => new Map(list.map(d => [d, 30]));

test("streak counts consecutive days and forgives one rest day per week", () => {
  // Fri 2026-10-23 is "today"; studied Mon–Thu, Wed off; previous week fully studied except Sat
  const m = days(["2026-10-12","2026-10-13","2026-10-14","2026-10-15","2026-10-16","2026-10-18","2026-10-19","2026-10-20","2026-10-22","2026-10-23"]);
  const s = streak(m, "2026-10-23");
  assert.equal(s.days, 10);
  assert.equal(s.studiedToday, true);
  assert.equal(s.restThisWeek, true);
});

test("streak breaks on the second missed day in the same week", () => {
  const m = days(["2026-10-19","2026-10-22","2026-10-23"]);
  assert.equal(streak(m, "2026-10-23").days, 2);
});

test("today not studied yet does not break the streak", () => {
  const m = days(["2026-10-21","2026-10-22"]);
  const s = streak(m, "2026-10-23");
  assert.equal(s.days, 2);
  assert.equal(s.studiedToday, false);
});

test("heatmap has weeks × 7 cells ending this week", () => {
  const h = heatmap(days(["2026-10-21"]), "2026-10-23", 3);
  assert.equal(h.length, 3);
  assert.equal(h[2][0].date, "2026-10-19");
  assert.equal(h[2][2].min, 30);
  assert.equal(h[2][6].future, true);
});

test("week summary", () => {
  const s = weekSummary({
    logs: [{date: "2026-10-19", min: 30}, {date: "2026-10-20", min: 45}, {date: "2026-10-27", min: 10}],
    reviews: [{date: "2026-10-19", cardId: "a", prev: "new"}, {date: "2026-10-20", cardId: "a", prev: "learning"}],
    done: {x: "2026-10-19", y: "2026-10-01"}
  }, "2026-10-19");
  assert.deepEqual(s, {min: 75, days: 2, reviews: 2, newWords: 1, tasks: 1});
});

test("known words ignore reverse cards", () => {
  assert.equal(knownCount([{state: "review", interval: 30}, {state: "review", interval: 30, dir: "rev"}, {state: "review", interval: 5}]), 1);
});

const T = (k, s, m) => ({k, s, t: k, m});
test("daily plan spreads open tasks over the days left with variety", () => {
  const tasks = [T("g1","gram",50), T("g2","gram",50), T("l1","list",40), T("r1","read",40), T("w1","writ",75), T("c1","conv",120)];
  // Monday, nothing done: 375 min over 6 study days (one rest) → ~63 min target
  const p = planDay({tasks, done: {}, todayISO: "2026-10-19", mondayISO: "2026-10-19", dayMap: new Map(), prev: null});
  assert.deepEqual(p.keys, ["g1", "l1"]);
  // same day again: keeps the stored plan and adds what was done today
  const again = planDay({tasks, done: {w1: "2026-10-19"}, todayISO: "2026-10-19", mondayISO: "2026-10-19", dayMap: new Map(), prev: {date: "2026-10-19", keys: p.keys}});
  assert.deepEqual(again.keys, ["g1", "l1", "w1"]);
  // Sunday: everything left goes to today
  const sun = planDay({tasks, done: {}, todayISO: "2026-10-25", mondayISO: "2026-10-19", dayMap: new Map(), prev: null});
  assert.equal(sun.keys.length, 6);
  // a plan stored today for another week's tasks is made again for this week
  const other = planDay({tasks, done: {c1: "2026-10-19"}, todayISO: "2026-10-19", mondayISO: "2026-10-19", dayMap: new Map(), prev: {date: "2026-10-19", keys: ["x9", "y9"]}});
  assert.equal(other.fresh, true);
  assert.ok(other.keys.includes("g1") && other.keys.includes("c1"));
});

test("achievements unlock once", () => {
  const ctx = {cards: 3, known: 0, streak: 8, hours: 2, weeksDone: 0, week: 1, efBest: 0, longestConv: 0, reviews: 10};
  assert.deepEqual(newlyUnlocked(ctx, {}).map(a => a.id), ["first-card", "streak-7"]);
  assert.deepEqual(newlyUnlocked(ctx, {"first-card": "x"}).map(a => a.id), ["streak-7"]);
});

test("a week closes when everything is done, or when its time is up and the core is done", () => {
  const core = {k: "GA01"}, vol = {k: "w2-in", vol: true}, extra = {k: "x2-eer", x: true};
  const tasks = [core, vol], extras = [extra];
  const all = {GA01: "d", "w2-in": "d", "x2-eer": "d"};
  assert.equal(weekClosed(tasks, extras, all, false), true);
  assert.equal(weekClosed(tasks, extras, {GA01: "d"}, false), false);
  assert.equal(weekClosed(tasks, extras, {GA01: "d"}, true), true);
  assert.equal(weekClosed(tasks, extras, {"w2-in": "d", "x2-eer": "d"}, true), false);
  assert.equal(weekClosed([], [], {}, true), false);
});
