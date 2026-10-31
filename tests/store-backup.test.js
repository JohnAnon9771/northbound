// load() without IndexedDB switches the store to memory only; restore and reset then work in memory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { S, load, persistent, exportAll, importAll, resetAll, addLog, update, putAudio, getAudio, allAudio, deleteAudio } from "../js/state/store.js";
import { toAudioBackup, fromAudioBackup, isAudioBackup, fromBackup } from "../js/state/backup-format.js";

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

test("recordings stay out of the main backup and travel in their own file", async () => {
  await load();
  update(s => { s.speak.push({id: "t1", date: "2026-10-01", level: "A2", parts: {mono: {sec: 120, audio: "a1"}}, crit: {}, errs: []}); });
  await putAudio({id: "a1", testId: "t1", part: "mono", mime: "audio/webm", sec: 120, blob: "x"});
  assert.equal((await getAudio("a1")).testId, "t1");
  const main = JSON.parse(JSON.stringify(exportAll()));
  assert.equal(main.audio, undefined);
  assert.equal(fromBackup(main).state.speak[0].parts.mono.audio, "a1");
  const file = JSON.parse(JSON.stringify(toAudioBackup([{id: "a1", testId: "t1", part: "mono", mime: "audio/webm", sec: 120, data: "AAAA", blob: "ignored"}])));
  assert.ok(isAudioBackup(file) && !isAudioBackup(main));
  assert.deepEqual(fromAudioBackup(file), [{id: "a1", testId: "t1", part: "mono", mime: "audio/webm", sec: 120, data: "AAAA"}]);
  assert.deepEqual(fromAudioBackup({app: "northbound-audio", audio: [{id: "x", data: "A", mime: "text/html"}]}), []);
  assert.throws(() => fromAudioBackup(main));
  await deleteAudio(["a1"]);
  assert.equal(await getAudio("a1"), undefined);
  await putAudio({id: "a2", testId: "t1"});
  await resetAll();
  assert.deepEqual(await allAudio(), []);
  assert.deepEqual(S.state.speak, []);
  assert.equal(S.state.spFrom, 1);
});
