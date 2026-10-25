import { test } from "node:test";
import assert from "node:assert/strict";
import { calWeekFor, expectedWeekFor, paceFor, firstOpenWeek, currentRoadmapWeek, weekComplete, weekTimeUpDate, calWeekStart, phaseNow, goalLabel } from "../js/domain/pace.js";
import { weekTasks } from "../js/domain/week-tasks.js";
import { extraTasks } from "../js/domain/goal-extras.js";
import { update } from "../js/state/store.js";
import { addDays, today, mondayOf } from "../js/core/date.js";

test("calendar weeks count from the route start", () => {
  assert.equal(calWeekFor("2026-10-19", "2026-10-18"), 0);
  assert.equal(calWeekFor("2026-10-19", "2026-10-19"), 1);
  assert.equal(calWeekFor("2026-10-19", "2026-10-25"), 1);
  assert.equal(calWeekFor("2026-10-19", "2026-10-26"), 2);
});

test("expected route week spreads 52 weeks over the target", () => {
  assert.equal(expectedWeekFor(0, 52), 1);
  assert.equal(expectedWeekFor(1, 52), 1);
  assert.equal(expectedWeekFor(53, 52), 53);
  assert.equal(expectedWeekFor(40, 39), 53);
  assert.equal(expectedWeekFor(20, 48), 21);
});

test("pace text", () => {
  const base = {start: "2026-10-19", targetWeeks: 52};
  assert.deepEqual(paceFor({...base, rw: 1, cw: 0}), {tone: "calm", text: "A rota começa em 19/10."});
  assert.equal(paceFor({...base, rw: 53, cw: 40}).tone, "ahead");
  assert.equal(paceFor({...base, rw: 12, cw: 10}).text, "2 semanas à frente da meta de 52 semanas.");
  assert.equal(paceFor({...base, rw: 11, cw: 10}).text, "1 semana à frente da meta de 52 semanas.");
  assert.equal(paceFor({...base, rw: 10, cw: 10}).tone, "ok");
  assert.match(paceFor({...base, rw: 9, cw: 10}).text, /^1 semana atrás/);
});

test("the current week is the first one neither skipped nor closed", () => {
  assert.equal(firstOpenWeek({}, () => false), 1);
  assert.equal(firstOpenWeek({2: true}, n => n === 1), 3);
  assert.equal(firstOpenWeek({}, () => true), 400);
});

test("with the store: closing week 1 moves you to week 2", () => {
  update(s => { s.settings.start = mondayOf(new Date()); s.revFrom = 1; s.done = {}; s.skip = {}; });
  assert.equal(currentRoadmapWeek(), 1);
  assert.equal(phaseNow().id, 0);
  const done = {};
  weekTasks(1).forEach(t => { done[t.k] = today(); });
  update(s => { s.done = Object.assign({}, done); });
  assert.equal(weekComplete(1), false);   // before its time is up, the goal extras count too
  extraTasks(1).forEach(t => { done[t.k] = today(); });
  update(s => { s.done = done; });
  assert.equal(weekComplete(1), true);
  assert.equal(currentRoadmapWeek(), 2);
  assert.equal(weekTimeUpDate(2), calWeekStart(3));   // on a 52-week target, week 2 runs out when calendar week 3 starts
  update(s => { s.settings.goalH = 18; });
  assert.equal(goalLabel(), "18 h");
});

test("with the store: a week whose time is up closes with only the core done", () => {
  update(s => { s.settings.start = addDays(today(), -7 * 10); s.settings.targetWeeks = 52; s.revFrom = 1; s.skip = {}; s.done = {}; });
  const done = {};
  [1, 2].forEach(n => weekTasks(n).forEach(t => { if (!t.vol || n === 1) done[t.k] = today(); }));
  update(s => { s.done = done; });
  assert.equal(weekComplete(2), true);
  assert.equal(currentRoadmapWeek(), 3);
});
