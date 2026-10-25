// The store runs under node without IndexedDB: writes fail quietly and the in-memory data still changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { S, update, updateQuiet, subscribe, addLog, deleteLog, restoreLog, putCard, putCards, deleteCard, cardById, addReview, setSecret, version } from "../js/state/store.js";
import { cached } from "../js/state/memo.js";
import { allLogs, minutesBy, hasContent } from "../js/state/selectors.js";

const tick = () => new Promise(r => queueMicrotask(r));

test("mutations notify subscribers once per microtask", async () => {
  let calls = 0;
  const off = subscribe(() => calls++);
  update(s => { s.settings.goalH = 20; });
  update(s => { s.settings.goalH = 21; });
  await tick();
  assert.equal(calls, 1);
  updateQuiet(s => { s.settings.goalH = 22; });
  await tick();
  assert.equal(calls, 1);
  off();
});

test("memo is cleared when the store changes", () => {
  let runs = 0;
  const f = () => cached("t", () => ++runs);
  f(); f();
  assert.equal(runs, 1);
  update(s => { s.settings.goalH = 18; });
  f();
  assert.equal(runs, 2);
});

test("logs: add, delete, restore and selectors", () => {
  assert.ok(!hasContent());
  const a = addLog({date: "2026-10-01", min: 30, skill: "list"});
  const b = addLog({date: "2026-10-02", min: 20, skill: "read"});
  assert.equal(addLog({min: 0}), null);
  assert.ok(hasContent());
  assert.deepEqual(allLogs().map(e => e.id), [b.id, a.id]);
  assert.equal(minutesBy(e => e.skill === "list"), 30);
  const gone = deleteLog(a.id);
  assert.equal(minutesBy(() => true), 20);
  assert.equal(deleteLog("nope"), null);
  restoreLog(gone);
  assert.equal(minutesBy(() => true), 50);
});

test("cards and reviews", () => {
  const v = version;
  putCard({id: "c1", term: "bank"});
  putCards([{id: "c1", term: "bank!"}, {id: "c2", term: "shore"}]);
  assert.equal(cardById("c1").term, "bank!");
  assert.equal(S.cards.length, 2);
  putCard({id: "c2", term: "coast"}, true);
  assert.equal(cardById("c2").term, "coast");
  assert.equal(deleteCard("c2").term, "coast");
  assert.equal(deleteCard("c2"), null);
  assert.ok(addReview({cardId: "c1", grade: 3}).id);
  assert.ok(version > v);
});

test("secrets", () => {
  setSecret("claudeKey", "sk-ant-x");
  assert.equal(S.secrets.claudeKey, "sk-ant-x");
  setSecret("claudeKey", "");
  assert.ok(!("claudeKey" in S.secrets));
});
