import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import * as timer from "../js/core/timer.js";

const MIN = 60000;
const realNow = Date.now;
let now = 0;
Date.now = () => now;
after(() => { Date.now = realNow; });
beforeEach(() => { timer.cancel(); now = 1_000_000; });

test("a break is left out of the logged minutes", () => {
  timer.start({skill: "lis", label: "x"});
  now += 20 * MIN;
  timer.pause();
  now += 15 * MIN;
  assert.equal(timer.elapsed(timer.running()), 20 * MIN);
  timer.resume();
  now += 10 * MIN;
  assert.equal(timer.stop().min, 30);
});

test("stopping during a break logs only the study time", () => {
  timer.start({skill: "lis", label: "x"});
  now += 25 * MIN;
  timer.pause();
  now += 40 * MIN;
  assert.equal(timer.stop().min, 25);
});

test("the rest stretch restarts after a break", () => {
  timer.start({skill: "lis", label: "x"});
  now += 50 * MIN;
  assert.ok(timer.stretch(timer.running()) >= timer.REST_AFTER);
  timer.pause();
  assert.equal(timer.stretch(timer.running()), 0);
  now += 10 * MIN;
  timer.resume();
  now += 5 * MIN;
  assert.equal(timer.stretch(timer.running()), 5 * MIN);
});

test("pause and resume are no-ops in the wrong state", () => {
  timer.pause();
  assert.equal(timer.running(), null);
  timer.start({skill: "lis", label: "x"});
  timer.resume();
  now += 3 * MIN;
  assert.equal(timer.elapsed(timer.running()), 3 * MIN);
  timer.pause();
  const at = timer.running().paused;
  now += MIN;
  timer.pause();
  assert.equal(timer.running().paused, at);
});

test("a timer saved before pauses existed still counts from start", () => {
  const t = {start: now - 12 * MIN, skill: "lis", label: "x"};
  assert.equal(timer.elapsed(t), 12 * MIN);
  assert.equal(timer.stretch(t), 12 * MIN);
});
