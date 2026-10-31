// The 4-weekly speaking test: when it happens, its level and topic, the read-aloud score from speech
// recognition, words per minute and the results over time. Pure, so it runs under node --test.
import { CRIT } from "../state/schema.js";
import { TOPICS, READ_TEXTS } from "../data/speaking-test.js";

// week 1 is the baseline, then every 4 weeks (also in the C1 phase, since 52 is a multiple of 4)
export const isSpeakWeek = n => n === 1 || (n >= 4 && n % 4 === 0);
// first test week from route week `from` on, counting only weeks that have the task (spFrom, see week-tasks.js)
export function nextSpeakWeek(from, spFrom){ let n = Math.max(from, spFrom || from); while (!isSpeakWeek(n)) n++; return n; }
export const speakLevel = n => n <= 12 ? "A2" : n <= 26 ? "B1" : n <= 52 ? "B2" : "C1";
// the level's last test week: it repeats the level's first topic, so the two recordings compare like for like
const LAST = {A2: 12, B1: 24, B2: 52};

const byDate = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0);

/* Level, topic and read-aloud text for a test in route week n. entries: the saved tests.
   scheduled: it's the week's route task (only then the level's last week repeats the first topic). */
export function planTest(n, entries, scheduled){
  const level = speakLevel(n), list = TOPICS[level];
  const done = entries.filter(e => e.level === level).sort(byDate);
  let i = 0, repeat = false;
  if (done.length){
    const first = list.findIndex(t => t.k === done[0].topic), last = list.findIndex(t => t.k === done[done.length - 1].topic);
    if (scheduled && n === LAST[level] && first > -1){ i = first; repeat = true; }
    else i = (last + 1) % list.length;
  }
  return {level, topic: list[i], text: READ_TEXTS[level], repeat};
}
export const topicByKey = k => { for (const l in TOPICS){ const t = TOPICS[l].find(x => x.k === k); if (t) return t; } return null; };

/* Words as speech recognition would write them: lower case, no punctuation or apostrophes, small numbers
   spelt out, and British/American spellings folded together (both sides get the same treatment). */
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const ORD = {"1st": "first", "2nd": "second", "3rd": "third"};
function norm(w){
  w = w.toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
  if (ORD[w]) w = ORD[w];
  else if (/^\d+$/.test(w) && Number(w) < NUM.length) w = NUM[Number(w)];
  return w.replace(/isation(s?)$/, "ization$1").replace(/(\p{L}{3,})our(s?)$/u, "$1or$2").replace(/ll(ed|ing)$/, "l$1");
}
const split = text => String(text || "").split(/[\s\-–—]+/);
export const words = text => split(text).map(norm).filter(Boolean);
// the reference text as display words with their keys, for marking what wasn't recognised
export const readTokens = text => split(text).map(w => ({w, k: norm(w)})).filter(t => t.k);

/* How many words of the reference the recognizer heard, in order: the longest common subsequence,
   so extra or repeated words in the transcript don't count against you. missed: indexes into readTokens. */
export function readScore(reference, transcript){
  const r = readTokens(reference).map(t => t.k), t = words(transcript);
  const n = r.length, m = t.length;
  if (!n) return {hit: 0, total: 0, pct: null, missed: []};
  const L = Array.from({length: n + 1}, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = r[i] === t[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const missed = [];
  let i = 0, j = 0;
  while (i < n){
    if (j < m && r[i] === t[j]){ i++; j++; }
    else if (j < m && L[i][j + 1] >= L[i + 1][j]) j++;
    else { missed.push(i); i++; }
  }
  return {hit: L[0][0], total: n, pct: Math.round(L[0][0] / n * 100), missed};
}
// words per minute; too short a sample says nothing
export const wpm = (n, sec) => n == null || !(sec >= 20) ? null : Math.round(n / sec * 60);

// the measures taken when the test was recorded
export function speakMeasures(e){
  const r = e.parts.read, m = e.parts.mono;
  return {readPct: r && r.total ? Math.round(r.hit / r.total * 100) : null, wpm: m ? wpm(m.n, m.sec) : null};
}
export function rubricAvg(crit){
  const v = CRIT.spk.map(k => crit[k]).filter(x => x != null);
  return v.length ? Math.round(v.reduce((a, x) => a + x, 0) / v.length * 10) / 10 : null;
}
export const speakSorted = entries => entries.slice().sort(byDate);

/* The latest speaking test on or before a date (ISO), for reports such as the checkpoint boletim.
   Returns null when there is none. crit holds only the scores given; avg is their mean (null if none). */
export function latestSpeakTest(entries, date){
  const s = speakSorted(entries || []).filter(e => e.date <= date);
  if (!s.length) return null;
  const e = s[s.length - 1], m = speakMeasures(e);
  return {id: e.id, date: e.date, week: e.week, level: e.level, topic: e.topic, crit: Object.assign({}, e.crit), avg: rubricAvg(e.crit), readPct: m.readPct, wpm: m.wpm, cefr: e.cefr};
}

/* Fills the examiner prompt (PROMPTS[8]) with this test. Each placeholder is replaced once, in order,
   so the block at the end keeps its own [CEFR estimate] and [topic]. */
export function examinerPrompt(template, e){
  const t = topicByKey(e.topic) || {t: "", q: ["", ""]}, p = e.parts, m = speakMeasures(e);
  const said = x => x && x.text ? x.text : "(no transcript)";
  const meas = [m.wpm != null ? "about " + m.wpm + " words per minute in the monologue" : "", m.readPct != null ? m.readPct + "% of a read-aloud paragraph recognised" : ""].filter(Boolean).join("; ") || "none";
  return [["[level]", e.level], ["[topic]", t.t], ["[monologue]", said(p.mono)], ["[q1]", t.q[0]], ["[a1]", said(p.f1)], ["[q2]", t.q[1]], ["[a2]", said(p.f2)], ["[measures]", meas]]
    .reduce((s, [k, v]) => s.replace(k, () => v), template);
}
