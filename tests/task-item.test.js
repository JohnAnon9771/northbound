import { test } from "node:test";
import assert from "node:assert/strict";
import { taskHTML, taskByKey, resetTasks, trackDetails, isOpen } from "../js/ui/task-item.js";
import { lessonTask } from "../js/data/weeks.js";
import { GA_IDS } from "../js/data/lessons.js";
import { update } from "../js/state/store.js";
import * as timer from "../js/core/study-timer.js";

test("a lesson task: link, minutes, lesson code, index link and score input", () => {
  const t = lessonTask("GA01");
  const h = taskHTML(t, {start: true});
  assert.equal(taskByKey("GA01"), t);
  assert.match(h, /<a class="task-title" href="https:[^"]+" target="_blank"/);
  assert.match(h, /50 min/);
  assert.match(h, /<span>GA01<\/span>/);
  assert.match(h, /data-score="GA01"/);
  assert.match(h, /data-act="task-start"/);
  assert.match(h, /class="task-note"/);
  assert.doesNotMatch(taskHTML(t, {compact: true}), /class="task-note"/);
  resetTasks();
  assert.equal(taskByKey("GA01"), undefined);
});

test("done, running and milestone states", () => {
  update(s => { s.done = {"w4-bc": "2026-10-25"}; s.scores = {GA01: [{k: "GA01", d: "2026-10-01", p: 70}]}; });
  const done = taskHTML({k: "w4-bc", s: "test", t: "Level test", m: 30, u: "#niveis", ms: true}, {start: true});
  assert.match(done, /class="task done milestone"/);
  assert.match(done, / checked/);
  assert.doesNotMatch(done, /task-start/);
  assert.doesNotMatch(done, /target="_blank"/);
  timer.start({task: "w2-pod", label: "Podcast", skill: "list"});
  assert.match(taskHTML({k: "w2-pod", s: "list", t: "Podcast", m: 40}, {start: true}), /Em andamento/);
  timer.cancel();
  assert.match(taskHTML({k: "w5-rt", s: "gram", t: "Retest", m: 20, sc: ["GA01"]}), /antes 70%/);
});

test("mixed tasks show every skill and the split", () => {
  const h = taskHTML({k: "x2-eer", s: "read", t: "Livro", m: 120, mix: [["read", 60], ["list", 60]]});
  assert.match(h, /Reading<\/span><span class="tag c-in">Listening/);
  assert.match(h, /120 min \(60 \+ 60\)/);
});

test("many scores go in a collapsible list that remembers being open", () => {
  const t = {k: "w1-gt1", s: "gram", t: "Grammar test 1", m: 120, sc: GA_IDS};
  assert.match(taskHTML(t), /<details class="score-more" data-det="w1-gt1">/);
  trackDetails({target: {dataset: {det: "w1-gt1"}, open: true}});
  assert.ok(isOpen("w1-gt1"));
  assert.match(taskHTML(t), /data-det="w1-gt1" open>/);
  trackDetails({target: {dataset: {det: "w1-gt1"}, open: false}});
  assert.ok(!isOpen("w1-gt1"));
});

test("review tasks list the lessons under 80%", () => {
  update(s => { s.scores = {GA01: [{k: "GA01", d: "2026-10-01", p: 60}], GA02: [{k: "GA02", d: "2026-10-01", p: 90}]}; });
  const h = taskHTML({k: "w25-blk", s: "gram", t: "Revisão", m: 120, rev: ["GA01", "GA02", "GA03"]});
  assert.match(h, /refaça esta:/);
  assert.match(h, /60%/);
  assert.match(h, /1 lição do bloco ainda está sem nota/);
  update(s => { s.scores = {}; });
  assert.match(taskHTML({k: "w25-blk", s: "gram", t: "Revisão", m: 120, rev: ["GA01"]}), /Nenhuma nota registrada/);
});
