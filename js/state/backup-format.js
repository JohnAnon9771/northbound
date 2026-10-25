// Backup file format: what "Baixar backup" writes and what "Restaurar" accepts.
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
