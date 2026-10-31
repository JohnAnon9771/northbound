import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeedback, errKey, countForTask, trend, latestLevel, repeatErrors, grammarTop, insights } from "../js/domain/gpt-feedback.js";
import { normalizeFeedback } from "../js/state/schema.js";

const CONV = `Great chat! Here is my feedback.

**1. Errors**
1. "I go to the beach yesterday" → "I went to the beach yesterday" (past simple)
2. **I have 30 years** -> **I'm 30**

**2. Better phrases**
- nice → lovely

Level: A2+
Scores: fluency 3/5, grammar 2.5/5, vocabulary 3/5
Errors:
I go to the beach yesterday → I went to the beach yesterday
- She don't like it → She doesn't like it — third person
Grammar point: Past simple vs present perfect`;

test("conversation block: level, scores, only the errors under the last header, grammar point", () => {
  const p = parseFeedback(CONV, "conv");
  assert.equal(p.level, "A2+");
  assert.deepEqual(p.crit, {flu: 3, gram: 2.5, voc: 3});
  assert.deepEqual(p.errs, [
    {wrong: "I go to the beach yesterday", right: "I went to the beach yesterday"},
    {wrong: "She don't like it", right: "She doesn't like it"}
  ]);
  assert.equal(p.grammar, "Past simple vs present perfect");
});

test("numbered errors section without a colon stops at the next bold title", () => {
  const p = parseFeedback('**1. Errors**\n1. "I go yesterday" → "I went yesterday"\n   Explanation: past.\n2. I have 30 years -> I\'m 30\n\n**2. Better phrases**\n- nice → lovely', "conv");
  assert.deepEqual(p.errs.map(e => e.right), ["I went yesterday", "I'm 30"]);
});

test("writing feedback in free form: CEFR line, criteria names and “should be”", () => {
  const p = parseFeedback('**Estimated CEFR level:** B1\nTask achievement: 3/5\nOrganisation: 4/5\nGrammar range and accuracy: 2/5\nVocabulary range: 3/5\n- I am agree should be I agree\n1) "informations" -> "information"\nRewrite one level higher (B1 to B2): ...', "writ");
  assert.equal(p.level, "B1");
  assert.deepEqual(p.crit, {ta: 3, org: 4, gram: 2, voc: 3});
  assert.deepEqual(p.errs, [{wrong: "I am agree", right: "I agree"}, {wrong: "informations", right: "information"}]);
});

test("scores of the other kind are ignored and empty text gives nothing", () => {
  assert.deepEqual(parseFeedback("fluency 4/5", "writ").crit, {});
  assert.deepEqual(parseFeedback("task 2/5", "conv").crit, {});
  assert.deepEqual(parseFeedback("", "conv"), {level: "", crit: {}, errs: [], grammar: ""});
});

test("errKey ignores case, quotes and punctuation", () => {
  assert.equal(errKey("“I have 30 years.”"), errKey("i have 30 years"));
  assert.equal(errKey("I don’t"), errKey("I don't"));
});

const s = (date, crit, o) => normalizeFeedback(Object.assign({kind: "conv", date, crit, errs: []}, o || {}));

test("normalizeFeedback: clamps scores, keeps the right criteria and drops bad entries", () => {
  const e = normalizeFeedback({kind: "conv", date: "2026-10-01", crit: {flu: 7, gram: 3.3, ta: 4}, feel: 9, level: "b1", errs: [{wrong: "a", right: ""}, {wrong: "x", right: "y"}]});
  assert.deepEqual(e.crit, {gram: 3.5});
  assert.equal(e.feel, null);
  assert.equal(e.level, "");
  assert.deepEqual(e.errs, [{wrong: "x", right: "y"}]);
  assert.equal(normalizeFeedback({kind: "talk", date: "2026-10-01"}), null);
  assert.equal(normalizeFeedback({kind: "conv", date: "ontem"}), null);
});

test("count per task, trend of the last 4 against the 4 before, latest level", () => {
  const list = [
    s("2026-09-01", {flu: 2, gram: 2}), s("2026-09-03", {flu: 2, gram: 3}), s("2026-09-05", {flu: 2, gram: 2}), s("2026-09-07", {flu: 2, gram: 3}),
    s("2026-09-09", {flu: 3, gram: 2}, {task: "w3-conv", level: "A2"}), s("2026-09-11", {flu: 3, gram: 2}, {task: "w3-conv"}),
    s("2026-09-13", {flu: 4, gram: 2}, {task: "w3-conv", level: "A2+"}), s("2026-09-15", {flu: 3, gram: 2})
  ];
  assert.equal(countForTask(list, "w3-conv"), 3);
  const t = trend(list, "conv");
  assert.deepEqual(t.map(x => [x.k, x.now, x.before]), [["flu", 3.25, 2], ["gram", 2, 2.5]]);
  assert.equal(latestLevel(list, "conv").level, "A2+");
  const tips = insights(list, {done: 2, goal: 3});
  assert.match(tips[0], /2 de 3 conversas.*Falta 1/);
  assert.ok(tips.includes("Fluência nas conversas subiu de 2 para 3,3 (média das últimas 4)."));
  assert.ok(tips.some(x => /Gramática.*caiu de 2,5 para 2/.test(x)));
});

test("repeated errors count sessions, not lines, and grammar topics are tallied", () => {
  const e = (date, errs, grammar) => normalizeFeedback({kind: "conv", date, errs, grammar});
  const list = [
    e("2026-09-01", [{wrong: "I have 30 years", right: "I'm 30"}, {wrong: "I have 30 years.", right: "I am 30"}], "Past simple"),
    e("2026-09-03", [{wrong: "i have 30 years", right: "I'm 30 years old"}], "past simple"),
    e("2026-09-05", [{wrong: "He go", right: "He goes"}], "Present simple")
  ];
  assert.deepEqual(repeatErrors(list), [{wrong: "I have 30 years", right: "I'm 30 years old", n: 2, last: "2026-09-03"}]);
  assert.deepEqual(grammarTop(list), [{t: "Past simple", n: 2}, {t: "Present simple", n: 1}]);
  assert.match(insights(list, {done: 3, goal: 3})[0], /Meta de conversas da semana cumprida/);
});
