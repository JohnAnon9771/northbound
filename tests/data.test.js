// Integrity of the bundled content: lessons, the 52-week plan, phases, skills, can-do, prompts and achievements.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LESSONS, LESSON_INDEXES, LINKS, GRAM_IDS, SKILL_IDS } from "../js/data/lessons.js";
import { WEEKS, PHASE_EXTRAS, DEFAULT_MIN, lessonTask } from "../js/data/weeks.js";
import { PHASES, phaseOf } from "../js/data/phases.js";
import { SKILLS, SKILL_ORDER, CATEGORY_NAMES, WEEK_SPLIT, skillOf } from "../js/data/skills.js";
import { CAN_DO } from "../js/data/can-do.js";
import { CHECKPOINTS, CHECKPOINT_SKILLS, REVISE } from "../js/data/checkpoints.js";
import { levelRank } from "../js/domain/checkpoint-report.js";
import { buildWeek } from "../js/domain/week-tasks.js";
import { PROMPTS } from "../js/data/prompts.js";
import { ACHIEVEMENTS } from "../js/domain/achievements.js";
import { RUBRIC, READ_TEXTS, TOPICS } from "../js/data/speaking-test.js";
import { CRIT } from "../js/state/schema.js";

// screen ids plus the old aliases the router still accepts (#roteiro, #semana, #flashcards)
const ROUTES = ["hoje", "palavras", "estudo", "rota", "progresso", "mais", "niveis", "rotinas", "ajustes", "fala", "roteiro", "semana", "flashcards"];
const okUrl = u => u == null || /^https:\/\/\S+$/.test(u) || (u[0] === "#" && ROUTES.includes(u.slice(1)));

test("every lesson has a known skill, level index and https link", () => {
  Object.values(LESSONS).forEach(L => {
    assert.ok(SKILLS[L.s], L.id + " skill");
    assert.ok(LESSON_INDEXES[L.idx], L.id + " index");
    assert.match(L.u, /^https:\/\//, L.id);
  });
  assert.equal(GRAM_IDS.length + SKILL_IDS.length, Object.keys(LESSONS).length);
  Object.values(LINKS).forEach(u => assert.match(u, /^https:\/\//));
});

test("weeks 1 to 52 exist and point only to known lessons, skills and links", () => {
  for (let n = 1; n <= 52; n++){
    const w = WEEKS[n];
    assert.ok(w && Array.isArray(w.items) && w.items.length, "week " + n);
    w.items.forEach(it => {
      if (typeof it === "string"){ assert.ok(LESSONS[it], "week " + n + ": unknown lesson " + it); return; }
      assert.ok(SKILLS[it.s], "week " + n + ": skill " + it.s);
      assert.ok(okUrl(it.u), "week " + n + ": link " + it.u);
      assert.ok(it.m > 0 && it.t, "week " + n + ": " + it.k);
      (it.sc || []).forEach(id => assert.ok(LESSONS[id], "week " + n + ": score lesson " + id));
    });
    (w.ms || []).forEach(m => assert.match(m, /^(bc|wi|ef:.+|cd:(A2|B1|B2))$/, "week " + n + " checkpoint"));
  }
  assert.equal(WEEKS[53], undefined);
});

test("every lesson task gets default minutes for its skill", () => {
  Object.keys(LESSONS).forEach(id => {
    const t = lessonTask(id);
    assert.equal(t.k, id);
    assert.equal(t.m, DEFAULT_MIN[t.s] || 40);
    assert.deepEqual(t.sc, [id]);
  });
});

test("phase extras use known skills and links", () => {
  Object.keys(PHASE_EXTRAS).forEach(p => {
    const px = PHASE_EXTRAS[p];
    assert.ok(px.conv > 0);
    px.extras.forEach(e => { assert.ok(SKILLS[e[1]], e[0]); assert.ok(okUrl(e[4]), e[0]); });
    if (px.vocab) assert.ok(LESSON_INDEXES[px.vocab[2]]);
  });
});

test("phases are contiguous and match phaseOf", () => {
  PHASES.forEach((p, i) => {
    assert.equal(p.id, i);
    if (i) assert.equal(p.from, PHASES[i - 1].to + 1);
    assert.ok(p.newPerDay > 0 && p.cards && p.gpt && p.check);
  });
  assert.equal(PHASES[0].from, 1);
  assert.equal(PHASES[PHASES.length - 1].to, null);
  for (let n = 1; n <= 80; n++){
    const p = PHASES[phaseOf(n)];
    assert.ok(n >= p.from && (p.to == null || n <= p.to), "week " + n);
  }
});

test("skills: order, categories, split and the old DuoCards name", () => {
  assert.deepEqual([...SKILL_ORDER].sort(), Object.keys(SKILLS).sort());
  Object.values(SKILLS).forEach(s => assert.ok(CATEGORY_NAMES[s.c]));
  WEEK_SPLIT.forEach(r => assert.ok(SKILLS[r[0]]));
  assert.equal(WEEK_SPLIT.reduce((a, r) => a + r[2], 0), 810);   // the base route, BASE_MIN
  assert.equal(skillOf("duo"), SKILLS.cards);
  assert.equal(skillOf("nope"), SKILLS.gram);
});

test("can-do items, prompts and achievements have unique ids", () => {
  const cando = Object.values(CAN_DO).flat().map(i => i[0]);
  assert.equal(new Set(cando).size, cando.length);
  assert.deepEqual(Object.keys(CAN_DO), ["A2", "B1", "B2"]);
  assert.ok(PROMPTS.length >= 8);
  PROMPTS.forEach(p => assert.ok(p[0] && p[1]));
  assert.match(PROMPTS[6][1], /\[\.\.\.\]/);   // filled with your recurring errors
  const ach = ACHIEVEMENTS.map(a => a.id);
  assert.equal(new Set(ach).size, ach.length);
});

test("speaking test: the rubric covers the test's criteria and every level has a text and topics", () => {
  assert.deepEqual(RUBRIC.map(r => r.k), CRIT.spk);
  RUBRIC.forEach(r => { assert.ok(r.n); assert.equal(r.d.length, 3); });
  assert.deepEqual(Object.keys(READ_TEXTS), ["A2", "B1", "B2", "C1"]);
  assert.deepEqual(Object.keys(TOPICS), ["A2", "B1", "B2", "C1"]);
  // read texts are spoken word by word: no digits or hyphens, which recognition writes differently
  Object.values(READ_TEXTS).forEach(t => { assert.doesNotMatch(t, /[\d-]/); const n = t.split(/\s+/).length; assert.ok(n >= 80 && n <= 115, n + " words"); });
  const keys = Object.values(TOPICS).flat().map(t => t.k);
  assert.equal(new Set(keys).size, keys.length);
  Object.values(TOPICS).forEach(list => {
    assert.ok(list.length >= 3);
    list.forEach(t => { assert.ok(t.t); assert.equal(t.q.length, 2); assert.equal(t.hints.length, 3); });
  });
});

test("each checkpoint has milestone tasks and a target per skill", () => {
  Object.keys(CHECKPOINTS).forEach(n => {
    const cp = CHECKPOINTS[n];
    assert.ok(buildWeek(Number(n), {revFrom: 1, skip: {}}).some(t => t.ms), "week " + n + " has a milestone");
    assert.ok(levelRank(cp.level) > -1, "week " + n + " level");
    CHECKPOINT_SKILLS.forEach(k => { assert.ok(levelRank(cp.targets[k].level) > -1, n + " " + k); assert.ok(REVISE[k]); });
    assert.ok(CAN_DO[cp.level.replace("+", "")], "week " + n + " has a can-do list");
  });
});
