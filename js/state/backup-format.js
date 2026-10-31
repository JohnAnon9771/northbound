// Backup file format: what "Baixar backup" writes and what "Restaurar" accepts.
// The speaking test recordings go in a file of their own (see toAudioBackup): about 1 MB per test,
// which would make the everyday backup tens of times bigger.
import { normalizeState, normalizeLog } from "./schema.js";

const APP = "northbound", VERSION = 2;

export function toBackup({state, logs, cards, reviews}){
  return {app: APP, v: VERSION, exported: new Date().toISOString(), state, logs, cards, reviews};
}

/* Accepts a backup from this site (app: "northbound") or from the old single-page version
   (v1: {settings, done, logs: {"2025-01": [...]}, ...}). Returns {state, logs, cards, reviews}. */
export function fromBackup(o){
  if (!o || typeof o !== "object") throw new Error("invalid");
  if (o.app === APP){
    return {
      state: normalizeState(o.state),
      logs: (o.logs || []).map(normalizeLog).filter(Boolean),
      cards: Array.isArray(o.cards) ? o.cards.filter(c => c && c.id && c.term) : [],
      reviews: Array.isArray(o.reviews) ? o.reviews.filter(r => r && r.cardId) : []
    };
  }
  if (!o.settings) throw new Error("invalid");
  const logs = [];
  Object.keys(o.logs || {}).forEach(m => { (Array.isArray(o.logs[m]) ? o.logs[m] : []).forEach(e => { const n = normalizeLog(e); if (n) logs.push(n); }); });
  return {state: normalizeState(o), logs, cards: [], reviews: []};
}

/* Recordings file. rows: {id, testId, part, mime, sec, data}, data being the audio in base64
   (the browser side converts to and from Blob). Restoring it adds recordings and replaces none of the rest. */
const AUDIO_APP = "northbound-audio";
export const isAudioBackup = o => !!o && o.app === AUDIO_APP;
export function toAudioBackup(rows){
  return {app: AUDIO_APP, v: 1, exported: new Date().toISOString(), audio: rows.map(r => ({id: r.id, testId: r.testId, part: r.part, mime: r.mime, sec: r.sec, data: r.data}))};
}
export function fromAudioBackup(o){
  if (!isAudioBackup(o) || !Array.isArray(o.audio)) throw new Error("invalid");
  return o.audio.filter(r => r && typeof r.id === "string" && typeof r.data === "string" && /^audio\//.test(r.mime || ""))
    .map(r => ({id: r.id, testId: String(r.testId || ""), part: String(r.part || ""), mime: r.mime, sec: Number(r.sec) || 0, data: r.data}));
}
