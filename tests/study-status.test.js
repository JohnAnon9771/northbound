import { test } from "node:test";
import assert from "node:assert/strict";
import { studyStatusAt, nextReviewOf } from "../js/ui/study-status.js";

const NOW = new Date(2026, 9, 25, 10, 0).getTime();
const MIN = 60000, DAY = 86400000;
const deck = extra => Object.assign({due: 0, fresh: 0, minutes: 1, total: 10, newWaiting: 0, blocked: false, limit: 10, reviewedToday: 0}, extra);

test("next review ignores new and suspended cards", () => {
  assert.equal(nextReviewOf([{state: "new", due: 1}, {state: "review", due: 50, suspended: true}, {state: "review", due: 90}, {state: "learning", due: 70}]), 70);
  assert.equal(nextReviewOf([{state: "new", due: 1}]), null);
});

test("ready: reviews and new cards with an estimate", () => {
  assert.deepEqual(studyStatusAt(deck({due: 3, fresh: 1, minutes: 2}), null, NOW), {ready: true, title: "3 revisões + 1 nova", why: "cerca de 2 min"});
  assert.match(studyStatusAt(deck({due: 1, blocked: true, newWaiting: 4}), null, NOW).why, /sem novas hoje$/);
});

test("empty deck", () => {
  assert.equal(studyStatusAt(deck({total: 0}), null, NOW).title, "deck vazio");
});

test("up to date: why the queue is empty and when the next review comes", () => {
  assert.equal(studyStatusAt(deck({}), NOW + 5 * MIN, NOW).why, "Nada vence hoje. Próxima revisão daqui a 5 min.");
  assert.equal(studyStatusAt(deck({reviewedToday: 4}), NOW + 3 * 60 * MIN, NOW).why, "Tudo revisado por hoje. Próxima revisão hoje, daqui a 3 h.");
  assert.equal(studyStatusAt(deck({}), NOW + DAY, NOW).why, "Nada vence hoje. Próxima revisão amanhã.");
  assert.equal(studyStatusAt(deck({}), NOW + 5 * DAY, NOW).why, "Nada vence hoje. Próxima revisão em 5 dias (30 out).");
  assert.equal(studyStatusAt(deck({}), null, NOW).why, "Nada vence hoje. ");
  assert.match(studyStatusAt(deck({newWaiting: 3, blocked: true}), null, NOW).why, /^As revisões de hoje passaram de 15 min/);
  assert.equal(studyStatusAt(deck({newWaiting: 3, limit: 10}), null, NOW).why, "Você já viu as 10 palavras novas de hoje (3 esperam na fila). ");
  assert.match(studyStatusAt(deck({newWaiting: 1, limit: 1}), null, NOW).why, /a palavra nova de hoje \(1 espera/);
});
