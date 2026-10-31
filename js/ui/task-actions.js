// Task actions: mark done (celebrating week and phase changes), start the timer, log time and enter scores.
import { S, update, addLog, deleteLog } from "../state/store.js";
import { today } from "../core/date.js";
import { toast } from "../core/toast.js";
import * as timer from "../core/study-timer.js";
import { skillOf } from "../data/skills.js";
import { PHASES, phaseOf } from "../data/phases.js";
import { scoreFor, setScore } from "../domain/lesson-scores.js";
import { currentRoadmapWeek } from "../domain/pace.js";
import { taskByKey } from "./task-item.js";
import { confetti } from "./confetti.js";
import { reportFor } from "./checkpoint-card.js";

export function logTask(task, min, note){
  const parts = task.mix ? splitMix(task.mix, min) : [[task.s, min]];
  return parts.filter(p => p[1] > 0).map(p => addLog({date: today(), min: p[1], skill: p[0], note: note || (task.bc ? task.k + " " + task.t : task.t.slice(0, 90)), task: task.k}));
}
// splits minutes across the skills of a mixed task, in proportion and without losing a minute to rounding
export function splitMix(mix, min){
  const total = mix.reduce((a, p) => a + p[1], 0) || 1;
  let left = min;
  return mix.map((p, i) => { const v = i === mix.length - 1 ? left : Math.round(min * p[1] / total); left -= v; return [p[0], v]; });
}
const logged = ens => ens.map(en => en.min + " min de " + skillOf(en.skill).n).join(" e ");
function undoLogs(ens){ return {label: "Desfazer", fn: () => ens.forEach(en => deleteLog(en.id))}; }

/* Marks a task as done and celebrates week/phase changes. */
export function setDone(key, on, el){
  const before = currentRoadmapWeek();
  update(s => { if (on) s.done[key] = today(); else delete s.done[key]; });
  const after = currentRoadmapWeek();
  if (on && after > before){
    const ph = phaseOf(after) > phaseOf(before);
    // a closed checkpoint week finished the content; the level may still lack evidence
    const r = reportFor(before), gap = r && !r.proven ? " Conteúdo concluído, mas o " + r.level + " ainda não foi comprovado (" + r.met + " de 4 habilidades): veja o boletim." : "";
    confetti(null, true);
    toast((ph ? "Começa a fase " + phaseOf(after) + ": " + PHASES[phaseOf(after)].name + "." : "Rumo à semana " + after + ".") + gap, gap ? [{label: "Ver boletim", fn: () => { location.hash = "#niveis"; }}] : [], {title: ph ? "Fase " + phaseOf(before) + " concluída!" : "Semana " + before + " fechada!", tone: "warm", ms: 6000});
    return true;
  }
  if (on && el) confetti(el);
  return false;
}

export const taskActions = {
  "task-toggle"(el){
    const key = el.dataset.task, task = taskByKey(key);
    if (el.checked) el.classList.add("pop");
    const big = setDone(key, el.checked, el);
    if (!el.checked || !task || big) return;
    const already = S.logs.some(e => e.task === key && e.date === today());
    const run = timer.running();
    if (already || (run && run.task === key) || !task.m) return;
    const what = task.mix ? task.mix.map(p => p[1] + " min de " + skillOf(p[0]).n).join(" e ") : task.m + " min de " + skillOf(task.s).n;
    toast("Feito! Registrar " + what + "?", [{label: "Registrar", fn: () => { const ens = logTask(task, task.m); toast("Registrado: " + logged(ens) + ".", [undoLogs(ens)]); }}]);
  },
  score(el){
    const raw = String(el.value).trim();
    let p = null;
    if (raw !== ""){
      p = Math.round(Number(raw));
      if (!(p >= 0 && p <= 100)){ toast("Use uma nota de 0 a 100."); el.value = scoreFor(S.state.scores, el.dataset.score, el.dataset.sk) ?? ""; return; }
    }
    update(s => setScore(s.scores, el.dataset.score, el.dataset.sk, p));
  },
  "task-start"(el){
    const task = taskByKey(el.dataset.task);
    if (!task) return;
    const run = timer.running();
    if (run){ toast("Já tem um cronômetro rodando: " + run.label + ". Pare ele primeiro."); return; }
    timer.start({skill: task.s, task: task.k, label: task.t, mix: task.mix || null, m: task.m});
    if (task.u && task.u.charAt(0) !== "#") toast("Cronômetro iniciado. Bom estudo!", [{label: "Abrir lição", fn: () => window.open(task.u, "_blank", "noopener")}]);
    else toast("Cronômetro iniciado. Bom estudo!");
  }
};

/* Called by the timer bar's stop button. */
export function stopTimer(){
  const t = timer.stop();
  if (!t) return;
  if (t.min < 1){ toast("Menos de 1 minuto, nada registrado."); return; }
  const min = Math.min(600, t.min);
  const task = t.task ? (taskByKey(t.task) || {k: t.task, s: t.skill, t: t.label, mix: t.mix, m: t.m}) : null;
  const ens = task ? logTask(task, min) : [addLog({date: today(), min, skill: t.skill, note: t.label || "cronômetro"})];
  if (task && !S.state.done[task.k]){
    toast("Registrado: " + logged(ens) + ". Terminou “" + task.t + "”?", [{label: "Concluir tarefa", fn: () => setDone(task.k, true)}, undoLogs(ens)], {ms: 12000});
  } else toast("Registrado: " + logged(ens) + ".", [undoLogs(ens)]);
}
