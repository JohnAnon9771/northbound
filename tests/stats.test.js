import { test } from "node:test";
import assert from "node:assert/strict";
import { minutesByDate, streak, heatmap, heatLevel, weekSummary, knownCount, learnedCount, knownTimeline, newIntroducedOn, reviewMsOn } from "../js/domain/stats.js";

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

test("minutes by date add up every log of the day", () => {
  const m = minutesByDate([{date: "2026-10-19", min: 30}, {date: "2026-10-19", min: 15}, {date: "2026-10-20", min: 5}]);
  assert.equal(m.get("2026-10-19"), 45);
  assert.equal(m.get("2026-10-20"), 5);
});

test("no study yet: no streak", () => {
  assert.deepEqual(streak(new Map(), "2026-10-23"), {days: 0, restThisWeek: true, studiedToday: false});
});

test("heat levels", () => {
  assert.deepEqual([0, 1, 19, 20, 59, 60, 119, 120].map(heatLevel), [0, 1, 1, 2, 2, 3, 3, 4]);
});

test("learned cards are front cards out of the new state", () => {
  assert.equal(learnedCount([{state: "new"}, {state: "learning"}, {state: "review", dir: "rev"}, {state: "review"}]), 2);
});

test("known timeline counts the first review that made each card known", () => {
  const cards = [{id: "a"}, {id: "b"}, {id: "r", dir: "rev"}];
  const reviews = [
    {cardId: "a", ivl: 25, date: "2026-10-06"}, {cardId: "a", ivl: 60, date: "2026-10-20"},
    {cardId: "b", ivl: 10, date: "2026-10-07"}, {cardId: "b", ivl: 22, date: "2026-10-21"},
    {cardId: "r", ivl: 30, date: "2026-10-06"}
  ];
  assert.deepEqual(knownTimeline(reviews, cards, 3, "2026-10-23"), [{week: "2026-10-05", n: 1}, {week: "2026-10-12", n: 1}, {week: "2026-10-19", n: 2}]);
});

test("new cards introduced and review time on a day", () => {
  const reviews = [
    {date: "2026-10-23", cardId: "a", prev: "new", ms: 5000}, {date: "2026-10-23", cardId: "a", prev: "learning", ms: 4000},
    {date: "2026-10-23", cardId: "b", prev: "review", ms: 120000}, {date: "2026-10-22", cardId: "c", prev: "new", ms: 1000}
  ];
  assert.equal(newIntroducedOn(reviews, "2026-10-23"), 1);
  assert.equal(reviewMsOn(reviews, "2026-10-23"), 4000 + 60000);   // one card counts at most 1 min
});
