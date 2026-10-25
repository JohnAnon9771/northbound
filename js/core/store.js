// In-memory app data, loaded once from IndexedDB at boot. Views read S synchronously;
// every change goes through a mutation below, which persists it and notifies subscribers.
import * as db from "./db.js";
import { blankState, normalizeState, normalizeLog, fromBackup } from "./migrate.js";
import { uid } from "./id.js";
import { today } from "./date.js";

export const S = {state: blankState(), logs: [], cards: [], reviews: [], secrets: {}};
export let persistent = true;
// bumped on every change; derived-data caches compare against it
export let version = 0;

const subs = new Set();
let queued = false;
export function subscribe(fn){ subs.add(fn); return () => subs.delete(fn); }
function emit(){
  version++;
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; subs.forEach(fn => fn()); });
}
const errorSubs = new Set();
export const onError = fn => errorSubs.add(fn);
function fail(err){ errorSubs.forEach(fn => fn(err)); }

export async function load(){
  try {
    const [state, logs, cards, reviews, secrets] = await Promise.all([db.get("meta", "state"), db.getAll("logs"), db.getAll("cards"), db.getAll("reviews"), db.get("meta", "secrets")]);
    S.state = normalizeState(state);
    S.logs = logs; S.cards = cards; S.reviews = reviews; S.secrets = secrets || {};
  } catch (e){
    persistent = false;
    S.state = normalizeState(null);
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e){}
  version++;
}

/* ---- state (settings, done, tests, errors…) ---- */
let saveTimer = null;
function saveState(){ clearTimeout(saveTimer); saveTimer = null; if (persistent) db.put("meta", S.state, "state").catch(fail); }
export function update(fn){
  fn(S.state);
  clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 250);
  emit();
}
// change without re-rendering (e.g. caching today's plan while rendering)
export function updateQuiet(fn){ fn(S.state); clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 250); version++; }
// guarded so the store also loads under node --test
if (typeof addEventListener === "function") addEventListener("pagehide", () => { if (saveTimer) saveState(); });

/* ---- logs ---- */
export function addLog(e){
  const entry = normalizeLog({id: uid(), date: e.date || today(), min: e.min, skill: e.skill, note: e.note || "", ts: Date.now(), task: e.task});
  if (!entry) return null;
  S.logs.push(entry);
  if (persistent) db.put("logs", entry).catch(fail);
  emit();
  return entry;
}
export function deleteLog(id){
  const i = S.logs.findIndex(e => e.id === id);
  if (i < 0) return null;
  const [e] = S.logs.splice(i, 1);
  if (persistent) db.del("logs", id).catch(fail);
  emit();
  return e;
}
export function restoreLog(e){ S.logs.push(e); if (persistent) db.put("logs", e).catch(fail); emit(); }

/* ---- cards and reviews ---- */
export const cardById = id => S.cards.find(c => c.id === id);
export function putCard(card, quiet){
  const i = S.cards.findIndex(c => c.id === card.id);
  if (i > -1) S.cards[i] = card; else S.cards.push(card);
  if (persistent) db.put("cards", card).catch(fail);
  if (quiet) version++; else emit();
  return card;
}
export function putCards(cards){
  cards.forEach(c => { const i = S.cards.findIndex(x => x.id === c.id); if (i > -1) S.cards[i] = c; else S.cards.push(c); });
  if (persistent) db.putMany("cards", cards).catch(fail);
  emit();
}
export function deleteCard(id){
  const i = S.cards.findIndex(c => c.id === id);
  if (i < 0) return null;
  const [c] = S.cards.splice(i, 1);
  if (persistent) db.del("cards", id).catch(fail);
  emit();
  return c;
}
export function addReview(r){
  const row = Object.assign({id: uid()}, r);
  S.reviews.push(row);
  if (persistent) db.put("reviews", row).catch(fail);
  version++;
  return row;
}

/* ---- secrets (never exported) ---- */
export function setSecret(key, value){
  if (value) S.secrets[key] = value; else delete S.secrets[key];
  if (persistent) db.put("meta", S.secrets, "secrets").catch(fail);
  emit();
}

/* ---- backup ---- */
export function exportAll(){
  return {app: "northbound", v: 2, exported: new Date().toISOString(), state: S.state, logs: S.logs, cards: S.cards, reviews: S.reviews};
}
export async function importAll(json){
  const d = fromBackup(json);
  S.state = d.state; S.logs = d.logs; S.cards = d.cards; S.reviews = d.reviews;
  if (persistent) await db.replace({meta: {state: S.state, secrets: S.secrets}, logs: S.logs, cards: S.cards, reviews: S.reviews});
  emit();
}
export async function resetAll(){
  const start = S.state.settings.start;
  S.state = blankState(); S.state.settings.start = start; S.state.revFrom = 1;
  S.logs = []; S.cards = []; S.reviews = [];
  if (persistent) await db.replace({meta: {state: S.state, secrets: S.secrets}, logs: [], cards: [], reviews: []});
  emit();
}
