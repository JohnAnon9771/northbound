// Task actions use the store and toasts; the toast element doesn't exist under node, so toasts are skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = {querySelector: () => null};
globalThis.matchMedia = () => ({matches: true});   // reduced motion: no confetti
const { splitMix, logTask, setDone } = await import("../js/ui/task-actions.js");
const { S, update } = await import("../js/state/store.js");
const { weekTasks } = await import("../js/domain/week-tasks.js");
const { extraTasks } = await import("../js/domain/goal-extras.js");
const { today, mondayOf } = await import("../js/core/date.js");

test("mixed minutes split in proportion and add up exactly", () => {
  assert.deepEqual(splitMix([["read", 60], ["list", 60]], 45), [["read", 23], ["list", 22]]);
  const three = splitMix([["read", 10], ["list", 20], ["conv", 30]], 61);
  assert.equal(three.reduce((a, p) => a + p[1], 0), 61);
  assert.deepEqual(splitMix([["read", 0]], 5), [["read", 5]]);
});

test("logging a task: one log per skill, with the task key and a note", () => {
  const before = S.logs.length;
  const mixed = logTask({k: "x2-eer", s: "read", t: "English e-Reader", mix: [["read", 60], ["list", 60]]}, 30);
  assert.deepEqual(mixed.map(e => [e.skill, e.min, e.task]), [["read", 15, "x2-eer"], ["list", 15, "x2-eer"]]);
  const lesson = logTask({k: "GA01", s: "gram", t: "Present simple", bc: true}, 50);
  assert.equal(lesson[0].note, "GA01 Present simple");
  assert.equal(logTask({k: "a", s: "gram", t: "x", mix: [["read", 1], ["list", 1]]}, 1).length, 1);   // a 0-min part is dropped
  assert.equal(S.logs.length, before + 4);
});

test("marking tasks done, and closing the week with the last one", () => {
  update(s => { s.settings.start = mondayOf(new Date()); s.settings.goalH = 13.5; s.revFrom = 1; s.done = {}; s.skip = {}; });
  const keys = weekTasks(1).concat(extraTasks(1)).map(t => t.k);
  assert.equal(setDone(keys[0], true), false);
  assert.equal(S.state.done[keys[0]], today());
  setDone(keys[0], false);
  assert.equal(S.state.done[keys[0]], undefined);
  keys.slice(1).forEach(k => setDone(k, true));
  assert.equal(setDone(keys[0], true), true);   // week 1 closes
});
