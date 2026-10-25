// Read-only views of the store shared by several screens.
import { S } from "./store.js";
import { cached } from "./memo.js";

export function allLogs(){ return cached("logs", () => S.logs.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts||0) - (a.ts||0))); }
export function minutesBy(fn){ let t = 0; S.logs.forEach(e => { if (fn(e)) t += e.min; }); return t; }
export function hasContent(){ const s = S.state; return Object.keys(s.done).length || S.logs.length || s.errors.length || s.tests.length || Object.keys(s.cando).length || Object.keys(s.skip).length || Object.keys(s.scores).length || S.cards.length; }
