// Dates are local ISO strings (YYYY-MM-DD) everywhere except SRS due times, which are timestamps.
export const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
export const MESES_LONG = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export const DIAS = ["dom","seg","ter","qua","qui","sex","sáb"];
export const DIAS_LONG = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
export const DAY_MS = 86400000;

export function iso(d){ return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
export function parse(s){ const p = String(s).split("-").map(Number); return new Date(p[0], (p[1]||1)-1, p[2]||1); }
export function today(){ return iso(new Date()); }
export function addDays(s, n){ const d = parse(s); d.setDate(d.getDate()+n); return iso(d); }
export function mondayOf(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay()+6)%7)); return iso(x); }
export function daysBetween(a, b){ return Math.round((parse(b) - parse(a)) / DAY_MS); }
export function shortDate(s){ const d = parse(s); return d.getDate() + " " + MESES[d.getMonth()]; }
export function longDate(s){ const d = parse(s); return DIAS_LONG[d.getDay()] + ", " + d.getDate() + " de " + MESES_LONG[d.getMonth()]; }
export function startOfDay(ms){ const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function endOfDay(ms){ return startOfDay(ms) + DAY_MS - 1; }
export const isoOf = ms => iso(new Date(ms));
