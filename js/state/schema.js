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
    achievements: {}, lastBackup: null, dayPlan: null, wl: blankWl()
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
  const rf = Number(o.revFrom);
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
    wl: normalizeWl(o.wl)
  };
}

export function normalizeLog(e){
  if (!e || !ISO.test(e.date) || !(Number(e.min) > 0)) return null;
  const out = {id: String(e.id || uid()), date: e.date, min: Math.round(Number(e.min)), skill: e.skill === "duo" ? "cards" : String(e.skill || "gram"), note: e.note ? String(e.note) : "", ts: Number(e.ts) || 0};
  if (e.task) out.task = String(e.task);
  return out;
}
