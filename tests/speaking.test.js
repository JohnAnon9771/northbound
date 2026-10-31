import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSpeakWeek, isSpeakWeek, speakLevel, planTest, words, readTokens, readScore, wpm, speakMeasures, rubricAvg, latestSpeakTest, examinerPrompt } from "../js/domain/speaking.js";
import { normalizeSpeak, normalizeState } from "../js/state/schema.js";
import { PROMPTS } from "../js/data/prompts.js";

test("schedule: week 1, then every 4 weeks, with the level of the phase", () => {
  const weeks = []; for (let n = 1; n <= 64; n++) if (isSpeakWeek(n)) weeks.push(n);
  assert.deepEqual(weeks, [1, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64]);
  assert.deepEqual([nextSpeakWeek(1, 1), nextSpeakWeek(2, 1), nextSpeakWeek(5, 1), nextSpeakWeek(5, 18), nextSpeakWeek(8, null)], [1, 4, 8, 20, 8]);
  assert.deepEqual([1, 12, 13, 26, 27, 52, 53].map(speakLevel), ["A2", "A2", "B1", "B1", "B2", "B2", "C1"]);
});

const sp = (date, o) => normalizeSpeak(Object.assign({date, level: "A2", topic: "a2-day", parts: {}}, o || {}));

test("topics rotate inside a level and the level's last test repeats its first topic", () => {
  assert.equal(planTest(1, [], true).topic.k, "a2-day");
  const list = [sp("2026-01-05", {topic: "a2-place"}), sp("2026-02-02", {topic: "a2-trip"})];
  assert.equal(planTest(8, list, true).topic.k, "a2-food");
  const last = planTest(12, list, true);
  assert.equal(last.topic.k, "a2-place");
  assert.ok(last.repeat);
  // a test outside the route doesn't repeat; a new level starts at its first topic
  assert.equal(planTest(12, list, false).topic.k, "a2-food");
  assert.equal(planTest(16, list, true).topic.k, "b1-change");
  assert.equal(planTest(16, list, true).level, "B1");
});

test("words: case, punctuation, apostrophes, numbers and British spellings", () => {
  assert.deepEqual(words("Arthur's Seat, on the 3rd floor: 2 friends!"), ["arthurs", "seat", "on", "the", "third", "floor", "two", "friends"]);
  assert.deepEqual(words("neighbour organisations travelled"), words("neighbor organizations traveled"));
  assert.deepEqual(words("  "), []);
});

test("readScore counts reference words heard in order and lists the missed ones", () => {
  const ref = "I think it is the best street in the city.";
  assert.deepEqual(readScore(ref, "i think it is the best street in the city"), {hit: 10, total: 10, pct: 100, missed: []});
  const r = readScore(ref, "I sink it is the the best tree in uh the city");
  assert.equal(r.hit, 8);
  assert.equal(r.pct, 80);
  assert.deepEqual(r.missed.map(i => readTokens(ref)[i].w), ["think", "street"]);
  assert.equal(readScore(ref, "").hit, 0);
  assert.equal(readScore("", "hello").pct, null);
});

test("words per minute and the stored measures", () => {
  assert.equal(wpm(180, 120), 90);
  assert.equal(wpm(10, 15), null);
  assert.equal(wpm(null, 120), null);
  const e = sp("2026-03-01", {parts: {read: {sec: 50, text: "x", n: 80, hit: 76, total: 95}, mono: {sec: 120, text: "y", n: 150}}});
  assert.deepEqual(speakMeasures(e), {readPct: 80, wpm: 75});
  assert.deepEqual(speakMeasures(sp("2026-03-01")), {readPct: null, wpm: null});
});

test("normalizeSpeak cleans scores and parts and drops bad entries", () => {
  const e = normalizeSpeak({date: "2026-03-01", level: "B1", week: 16, crit: {flu: 3.3, pron: 9, coh: "", ta: 4}, parts: {read: {sec: 40, text: "hi", hit: 120, total: 95}, f1: {sec: -3, n: null}, bad: {}}});
  assert.deepEqual(e.crit, {flu: 3.5});
  assert.deepEqual(Object.keys(e.parts), ["read", "f1"]);
  assert.equal(e.parts.read.hit, 95);
  assert.equal(e.parts.f1.sec, 0);
  assert.equal(e.parts.f1.n, null);
  assert.equal(normalizeSpeak({date: "2026-03-01", level: "B3"}), null);
  assert.equal(normalizeSpeak({date: "ontem", level: "B1"}), null);
  const st = normalizeState({speak: [e, {date: "x"}], spFrom: 9});
  assert.equal(st.speak.length, 1);
  assert.equal(st.spFrom, 9);
  assert.equal(normalizeState({}).spFrom, null);
});

test("latestSpeakTest: the last test up to a date, with average and measures", () => {
  const list = [
    sp("2026-03-01", {id: "a", crit: {flu: 2, gram: 3}, ts: 1}),
    sp("2026-04-01", {id: "b", crit: {flu: 3, pron: 2, voc: 3, gram: 3, coh: 2}, cefr: "A2+", parts: {mono: {sec: 120, n: 160}}, ts: 1}),
    sp("2026-04-01", {id: "c", ts: 2}),
    sp("2026-05-01", {id: "d"})
  ];
  assert.equal(latestSpeakTest(list, "2026-02-28"), null);
  assert.equal(latestSpeakTest(list, "2026-03-15").avg, 2.5);
  assert.equal(latestSpeakTest(list, "2026-04-01").id, "c");
  const b = latestSpeakTest(list.slice(0, 2), "2026-04-30");
  assert.deepEqual(b, {id: "b", date: "2026-04-01", week: null, level: "A2", topic: "a2-day", crit: {flu: 3, pron: 2, voc: 3, gram: 3, coh: 2}, avg: 2.6, readPct: null, wpm: 80, cefr: "A2+"});
  assert.equal(rubricAvg({}), null);
  assert.equal(latestSpeakTest([], "2026-04-01"), null);
});

test("examiner prompt is filled once per placeholder and keeps the final block", () => {
  const e = sp("2026-03-01", {parts: {mono: {sec: 120, n: 150, text: "my day starts early"}, f1: {text: "the evening"}}});
  const p = examinerPrompt(PROMPTS[8][1], e);
  assert.match(p, /at A2 level/);
  assert.match(p, /Monologue topic: Describe a typical day in your life\./);
  assert.match(p, /Monologue: my day starts early/);
  assert.match(p, /Answer 2: \(no transcript\)/);
  assert.match(p, /about 75 words per minute/);
  assert.match(p, /Grammar point: \[topic\]$/);
  assert.match(p, /Scores: fluency X\/5, grammar X\/5, vocabulary X\/5, coherence X\/5/);
});
