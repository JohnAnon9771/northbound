import { test } from "node:test";
import assert from "node:assert/strict";
import { weekClosed, openCore } from "../js/domain/week-close.js";

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

test("open core leaves out volume tasks", () => {
  assert.deepEqual(openCore([{k: "a"}, {k: "b", vol: true}, {k: "c"}], {c: "d"}).map(t => t.k), ["a"]);
});
