// State shape: the blank state and normalizers that clean whatever comes from IndexedDB or a backup.
// Pure functions (no DOM, no IndexedDB) so they run under node --test.
import { mondayOf } from "../core/date.js";
import { uid } from "../core/id.js";
import { blankWl, normalizeWl } from "../flashcards/word-list.js";

export const STATE_VERSION = 2;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function blankState(){
  return {
    v: STATE_VERSION,
    settings: {start: mondayOf(new Date()), goalH: 18, targetWeeks: 52, accent: "en-GB", newPerDay: null, mmEmail: "", claudeModel: "claude-haiku-5-5"},
    done: {}, skip: {}, cando: {}, errors: [], tests: [], scores: {}, revFrom: null,
    achievements: {}, lastBackup: null, dayPlan: null, wl: blankWl(), feedback: [], speak: [], spFrom: null
  };
}

export function normalizeState(o){
  const b = blankState();
  o = o && typeof o === "object" ? o : {};
  const s = Object.assign({}, b.settings, o.settings || {});
  if (!ISO.test(s.start)) s.start = b.settings.start;
  s.goalH = Math.min(30, Math.max(4, Number(s.goalH) || 18));
  s.targetWeeks = [39,44,48,52].indexOf(Number(s.targetWeeks)) > -1 ? Number(s.targetWeeks) : 52;
  s.accent = s.accent === "en-US" ? "en-US" : "en-GB";
  s.newPerDay = s.newPerDay == null || s.newPerDay === "" ? null : Math.min(50, Math.max(0, Math.round(Number(s.newPerDay)) || 0));
  s.mmEmail = typeof s.mmEmail === "string" ? s.mmEmail.trim() : "";
  s.claudeModel = /^claude-[a-z0-9-]+$/.test(s.claudeModel || "") ? s.claudeModel : "claude-haiku-5-5";
  const scores = {};
  Object.keys(o.scores && typeof o.scores === "object" ? o.scores : {}).forEach(id => {
    const arr = Array.isArray(o.scores[id]) ? o.scores[id].filter(e => e && e.k && ISO.test(e.d) && e.p >= 0 && e.p <= 100).map(e => ({k: String(e.k), d: e.d, p: Math.round(Number(e.p))})) : [];
    if (arr.length) scores[id] = arr;
  });
  const rf = Number(o.revFrom), sf = Number(o.spFrom);
  const plan = o.dayPlan && ISO.test(o.dayPlan.date) && Array.isArray(o.dayPlan.keys) ? {date: o.dayPlan.date, keys: o.dayPlan.keys.map(String)} : null;
  return {
    v: STATE_VERSION, settings: s,
    done: Object.assign({}, o.done || {}), skip: Object.assign({}, o.skip || {}), cando: Object.assign({}, o.cando || {}),
    errors: Array.isArray(o.errors) ? o.errors.filter(e => e && e.id).map(e => Object.assign({}, e)) : [],
    tests: Array.isArray(o.tests) ? o.tests.filter(e => e && e.id).map(e => Object.assign({}, e)) : [],
    scores, revFrom: o.revFrom != null && rf >= 1 && rf < 1000 ? Math.floor(rf) : null,
    achievements: Object.assign({}, o.achievements || {}),
    lastBackup: typeof o.lastBackup === "string" ? o.lastBackup : null,
    dayPlan: plan,
    wl: normalizeWl(o.wl),
    feedback: Array.isArray(o.feedback) ? o.feedback.map(normalizeFeedback).filter(Boolean) : [],
    speak: Array.isArray(o.speak) ? o.speak.map(normalizeSpeak).filter(Boolean) : [],
    spFrom: o.spFrom != null && sf >= 1 && sf < 1000 ? Math.floor(sf) : null
  };
}

// One ChatGPT session in the Diário: a conversation ("conv") or a corrected text ("writ").
// "coh" (coherence and argument) came later, so older conversations simply lack it.
// "spk" is the 4-weekly speaking test (see normalizeSpeak), not a Diário kind.
export const CRIT = {conv: ["flu", "gram", "voc", "coh"], writ: ["ta", "org", "gram", "voc"], spk: ["flu", "pron", "voc", "gram", "coh"]};
const LEVEL = /^[ABC][12]\+?$/;
const str = (v, n) => typeof v === "string" ? v.trim().slice(0, n) : "";
export function normalizeFeedback(e){
  if (!e || (e.kind !== "conv" && e.kind !== "writ") || !ISO.test(e.date)) return null;
  const crit = {};
  CRIT[e.kind].forEach(k => { const v = Number(e.crit && e.crit[k]); if (e.crit && e.crit[k] != null && e.crit[k] !== "" && v >= 0 && v <= 5) crit[k] = Math.round(v * 2) / 2; });
  const feel = Math.round(Number(e.feel));
  return {
    id: String(e.id || uid()), kind: e.kind, date: e.date, task: str(e.task, 40), topic: str(e.topic, 120),
    min: Number(e.min) > 0 ? Math.min(600, Math.round(Number(e.min))) : 0,
    feel: e.kind === "conv" && feel >= 1 && feel <= 5 ? feel : null,
    level: LEVEL.test(e.level || "") ? e.level : "",
    crit,
    errs: Array.isArray(e.errs) ? e.errs.filter(x => x && str(x.wrong, 160) && str(x.right, 160)).slice(0, 20).map(x => ({wrong: str(x.wrong, 160), right: str(x.right, 160)})) : [],
    grammar: str(e.grammar, 160), raw: str(e.raw, 6000), ts: Number(e.ts) || 0
  };
}

// One speaking test: the four recorded parts (read aloud, monologue, two follow-ups) with what speech
// recognition heard, the measures taken when it was recorded, and the rubric scores added afterwards.
// The audio itself lives in the "audio" store; a part only keeps its id.
export const SPEAK_PARTS = ["read", "mono", "f1", "f2"];
const int = (v, max) => Number(v) >= 0 ? Math.min(max, Math.round(Number(v))) : 0;
export function normalizeSpeak(e){
  if (!e || !ISO.test(e.date) || !/^(A2|B1|B2|C1)$/.test(e.level || "")) return null;
  const crit = {};
  CRIT.spk.forEach(k => { const v = Number(e.crit && e.crit[k]); if (e.crit && e.crit[k] != null && e.crit[k] !== "" && v >= 0 && v <= 5) crit[k] = Math.round(v * 2) / 2; });
  const parts = {};
  SPEAK_PARTS.forEach(k => {
    const p = e.parts && e.parts[k];
    if (!p || typeof p !== "object") return;
    // n: words recognised (null when the browser had no speech recognition)
    const out = {sec: int(p.sec, 900), text: str(p.text, 4000), n: p.n == null ? null : int(p.n, 5000), audio: str(p.audio, 40)};
    if (k === "read" && Number(p.total) > 0) Object.assign(out, {total: int(p.total, 1000), hit: Math.min(int(p.hit, 1000), int(p.total, 1000))});
    parts[k] = out;
  });
  const wk = Number(e.week);
  return {
    id: String(e.id || uid()), date: e.date, week: wk >= 1 && wk < 1000 ? Math.floor(wk) : null, task: str(e.task, 40),
    level: e.level, topic: str(e.topic, 40), parts, crit,
    cefr: LEVEL.test(e.cefr || "") ? e.cefr : "",
    errs: Array.isArray(e.errs) ? e.errs.filter(x => x && str(x.wrong, 160) && str(x.right, 160)).slice(0, 20).map(x => ({wrong: str(x.wrong, 160), right: str(x.right, 160)})) : [],
    grammar: str(e.grammar, 160), raw: str(e.raw, 6000), ts: Number(e.ts) || 0
  };
}

export function normalizeLog(e){
  if (!e || !ISO.test(e.date) || !(Number(e.min) > 0)) return null;
  const out = {id: String(e.id || uid()), date: e.date, min: Math.round(Number(e.min)), skill: e.skill === "duo" ? "cards" : String(e.skill || "gram"), note: e.note ? String(e.note) : "", ts: Number(e.ts) || 0};
  if (e.task) out.task = String(e.task);
  return out;
}
