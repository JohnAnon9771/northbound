// load() without IndexedDB switches the store to memory only; restore and reset then work in memory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { S, load, persistent, exportAll, importAll, resetAll, addLog, update } from "../js/state/store.js";

test("restore a backup and reset everything, in memory", async () => {
  await load();
  assert.equal(persistent, false);
  update(s => { s.settings.start = "2026-09-07"; });
  addLog({date: "2026-10-01", min: 20, skill: "list"});
  const file = JSON.parse(JSON.stringify(exportAll()));
  await resetAll();
  assert.equal(S.logs.length, 0);
  assert.equal(S.state.settings.start, "2026-09-07");   // reset keeps the route start
  assert.equal(S.state.revFrom, 1);
  await importAll(file);
  assert.equal(S.logs.length, 1);
  await assert.rejects(importAll({hello: 1}));
});
