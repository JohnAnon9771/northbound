// Golden snapshot of the route: every week's tasks, extras and labels, plus the weekly split, for a few fixed states.
// It guards refactors of the route code. The fixture keeps each week's task keys (readable) and a hash of everything.
// After an intended content change, regenerate with:
//   UPDATE_SNAPSHOT=1 node --test tests/route-snapshot.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { update } from "../js/state/store.js";
import { normalizeState } from "../js/state/schema.js";
import { weekTasks, weekLabel, weekMilestone, weekNote } from "../js/domain/week-tasks.js";
import { extraTasks, planSplit, extraPlan } from "../js/domain/goal-extras.js";

const FIXTURE = new URL("./fixtures/route-snapshot.json", import.meta.url);
const STATES = {
  base: {settings: {goalH: 13.5}, revFrom: 1},
  goal18: {settings: {goalH: 18}, revFrom: 1},
  legacy: {settings: {goalH: 18}, revFrom: 10},
  skipped: {settings: {goalH: 22}, revFrom: 1, skip: {5: true, 6: true}}
};

const hash = v => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

function capture(){
  const out = {};
  Object.keys(STATES).forEach(name => {
    const st = normalizeState(STATES[name]);
    update(s => { Object.assign(s, st); });
    const weeks = {};
    for (let n = 1; n <= 60; n++){
      const w = {label: weekLabel(n), milestone: weekMilestone(n), note: weekNote(n), tasks: weekTasks(n), extras: extraTasks(n)};
      weeks[n] = {keys: w.tasks.concat(w.extras).map(t => t.k).join(" "), hash: hash(w)};
    }
    out[name] = {extraPlan: extraPlan(), split: hash(planSplit(false)), splitMerged: hash(planSplit(true)), weeks};
  });
  return out;
}

test("route output matches the snapshot", () => {
  const now = capture();
  if (process.env.UPDATE_SNAPSHOT){ writeFileSync(FIXTURE, JSON.stringify(now, null, 1) + "\n"); return; }
  const saved = JSON.parse(readFileSync(FIXTURE, "utf8"));
  Object.keys(saved).forEach(name => {
    assert.deepEqual(now[name].extraPlan, saved[name].extraPlan, name + " extraPlan");
    assert.deepEqual(now[name].split, saved[name].split, name + " split");
    assert.deepEqual(now[name].splitMerged, saved[name].splitMerged, name + " splitMerged");
    Object.keys(saved[name].weeks).forEach(n => assert.deepEqual(now[name].weeks[n], saved[name].weeks[n], name + " week " + n));
  });
});
