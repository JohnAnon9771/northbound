// Where you are on the route: calendar week, current route week, whether a week closed and the pace against the target.
import { S } from "../state/store.js";
import { cached } from "../state/memo.js";
import { today, daysBetween, addDays } from "../core/date.js";
import { formatHours } from "../core/format.js";
import { PHASES, phaseOf } from "../data/phases.js";
import { weekTasks } from "./week-tasks.js";
import { extraTasks } from "./goal-extras.js";
import { weekClosed } from "./week-close.js";

// calendar week of a date, counted from the route start (0 before it starts)
export function calWeekFor(start, dateStr){ const d = daysBetween(start, dateStr); return d < 0 ? 0 : Math.floor(d / 7) + 1; }
export const calWeekOf = dateStr => calWeekFor(S.state.settings.start, dateStr);
export function calWeekStart(cw){ return addDays(S.state.settings.start, (Math.max(cw, 1) - 1) * 7); }
export function weekStats(n){ return cached("s" + n, () => { const t = weekTasks(n); let d = 0; t.forEach(x => { if (S.state.done[x.k]) d++; }); return {done:d, total:t.length}; }); }
// done with everything, or out of time with the core done (see week-close.js)
export const weekTimeUp = n => expectedWeek(calWeekOf(today())) > n;
// first day the target pace expects you past week n
export function weekTimeUpDate(n){ for (let cw = Math.max(1, calWeekOf(today())); ; cw++) if (expectedWeek(cw) > n) return calWeekStart(cw); }
export function weekComplete(n){ return cached("c" + n + today(), () => weekClosed(weekTasks(n), extraTasks(n), S.state.done, weekTimeUp(n))); }
// the route week you're on: the first one neither skipped nor closed
export function firstOpenWeek(skip, isComplete){
  for (let n = 1; n < 400; n++){ if (skip[n] || isComplete(n)) continue; return n; }
  return 400;
}
export const currentRoadmapWeek = () => cached("rw" + today(), () => firstOpenWeek(S.state.skip, weekComplete));
// route week the target pace expects in calendar week cw (52 route weeks spread over targetWeeks)
export function expectedWeekFor(cw, targetWeeks){ return Math.floor((Math.max(1, cw) - 1) * 52 / targetWeeks) + 1; }
export const expectedWeek = cw => expectedWeekFor(cw, S.state.settings.targetWeeks);
export function paceFor({rw, cw, start, targetWeeks: tw}){
  if (cw === 0) return {tone: "calm", text: "A rota começa em " + start.split("-").reverse().slice(0, 2).join("/") + "."};
  if (rw >= 53) return {tone: "ahead", text: "Você terminou a rota do B2. Agora é a fase do C1."};
  const diff = rw - expectedWeekFor(cw, tw);
  if (diff > 0) return {tone: "ahead", text: diff + (diff === 1 ? " semana" : " semanas") + " à frente da meta de " + tw + " semanas."};
  if (diff === 0) return {tone: "ok", text: "No ritmo da meta de " + tw + " semanas."};
  return {tone: "behind", text: (-diff) + ((-diff) === 1 ? " semana" : " semanas") + " atrás da meta de " + tw + " semanas. Priorize o volume de horas, não a ordem das tarefas."};
}
export const paceText = rw => paceFor({rw, cw: calWeekOf(today()), start: S.state.settings.start, targetWeeks: S.state.settings.targetWeeks});

export const goalLabel = () => formatHours(S.state.settings.goalH * 60) + " h";
export const phaseNow = () => PHASES[phaseOf(currentRoadmapWeek())];
