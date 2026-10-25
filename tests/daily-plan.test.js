import { test } from "node:test";
import assert from "node:assert/strict";
import { planDay, nextOpen } from "../js/domain/daily-plan.js";

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

test("a rest day already used this week means no rest day is set aside", () => {
  const tasks = [T("a","gram",120), T("b","list",120), T("c","read",120)];
  const fresh = planDay({tasks, done: {}, todayISO: "2026-10-21", mondayISO: "2026-10-19", dayMap: new Map([["2026-10-19", 30], ["2026-10-20", 30]]), prev: null});
  const rested = planDay({tasks, done: {}, todayISO: "2026-10-21", mondayISO: "2026-10-19", dayMap: new Map([["2026-10-19", 30]]), prev: null});
  assert.equal(fresh.target, 90);    // 360 min over 4 study days (5 left, one kept for rest)
  assert.equal(rested.target, 72);   // 360 min over 5 days
});

test("pull one more: the next open task not already in today's list", () => {
  const tasks = [T("a","gram",10), T("b","list",10), T("c","read",10)];
  assert.equal(nextOpen(tasks, {a: "d"}, ["b"]).k, "c");
  assert.equal(nextOpen(tasks, {a: "d", c: "d"}, ["b"]), null);
});
