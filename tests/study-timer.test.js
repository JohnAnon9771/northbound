// Without localStorage (node) the timer still works in memory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { start, stop, cancel, running, onTimer } from "../js/core/study-timer.js";

test("start, stop with minutes, and cancel", () => {
  const seen = [];
  onTimer(t => seen.push(t && t.label));
  assert.equal(running(), null);
  start({skill: "list", label: "Podcast", start: Date.now() - 25 * 60000});
  assert.equal(running().skill, "list");
  const t = stop();
  assert.equal(t.min, 25);
  assert.equal(running(), null);
  assert.equal(stop(), null);
  start({skill: "read", label: "Livro"});
  cancel();
  assert.equal(running(), null);
  assert.deepEqual(seen, ["Podcast", null, null, "Livro", null]);   // every stop notifies, even with nothing running
});
