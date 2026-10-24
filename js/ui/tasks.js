// Shared task, score and log rendering plus their actions (used by Hoje and Rota).
import { S, update, addLog, deleteLog, restoreLog } from "../core/store.js";
import { esc, icon } from "../core/dom.js";
import { today, shortDate } from "../core/date.js";
import { toast } from "../core/toast.js";
import * as timer from "../core/timer.js";
import { LES, IDX } from "../data/lessons.js";
import { sk } from "../data/skills.js";
import { PH, phaseOf, weekMilestone, weekNote, scoreFor, latestScore, setScore, lowLessons, currentRoadmapWeek } from "../domain/route.js";
import { confetti } from "./celebrate.js";

// every task rendered in the current view, by key, for the actions below
const TASKS = new Map();
export const resetTasks = () => TASKS.clear();
export const taskByKey = k => TASKS.get(k);

export function taskHTML(t, opts){
  const o = opts || {};
  TASKS.set(t.k, t);
  const done = !!S.state.done[t.k], c = sk(t.s).c;
  const run = timer.running();
  const isRunning = run && run.task === t.k;
  const ext = t.u && t.u.charAt(0) !== "#";
  const title = t.u ? '<a class="task-title" href="' + esc(t.u) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(t.t) + "</a>" : '<span class="task-title">' + esc(t.t) + "</span>";
  const meta = t.mix ? t.mix.map(p => '<span class="tag c-' + sk(p[0]).c + '">' + sk(p[0]).n + "</span>") : ['<span class="tag c-' + c + '">' + sk(t.s).n + "</span>"];
  if (t.m) meta.push("<span>" + (t.mix ? t.m + " min (" + t.mix.map(p => p[1]).join(" + ") + ")" : t.m + " min") + "</span>");
  if (t.bc) meta.push("<span>" + esc(t.k) + "</span>");
  if (t.idx) meta.push('<a href="' + IDX[t.idx][1] + '" target="_blank" rel="noopener">' + IDX[t.idx][0] + "</a>");
  const start = o.start && !done && t.m ? '<button class="btn btn-small ' + (isRunning ? "btn-soft" : "btn-ghost") + ' task-start" type="button" data-act="task-start" data-task="' + esc(t.k) + '"' + (isRunning ? " disabled" : "") + ">" + (isRunning ? "Em andamento" : icon("play", 14) + "Começar") + "</button>" : "";
  return '<li class="task' + (done ? " done" : "") + (t.ms ? " milestone" : "") + (isRunning ? " running" : "") + '"><input type="checkbox" class="chk" data-change="task-toggle" data-task="' + esc(t.k) + '" data-fk="task-' + esc(t.k) + '"' + (done ? " checked" : "") + ' aria-label="Concluir: ' + esc(t.t) + '"><div class="task-body">' + title + '<div class="task-meta">' + meta.join("") + "</div>" + (t.n && !o.compact ? '<p class="task-note">' + esc(t.n) + "</p>" : "") + revHTML(t) + scoreHTML(t) + "</div>" + start + "</li>";
}

const openDetails = new Set();
export const isOpen = key => openDetails.has(key);
function scoreHTML(t){
  if (!t.sc || !t.sc.length) return "";
  const multi = t.sc.length > 1;
  const rows = t.sc.map(id => {
    const L = LES[id], v = scoreFor(id, t.k), prev = latestScore(id, t.k);
    const name = multi ? L.t : (L.s === "gram" ? "Nota do Grammar test 2" : "Nota");
    return '<label class="score"><span class="score-n">' + esc(name) + '</span><span class="score-in"><input type="number" min="0" max="100" step="1" inputmode="numeric" data-change="score" data-score="' + esc(id) + '" data-sk="' + esc(t.k) + '" data-fk="sc-' + esc(id) + "-" + esc(t.k) + '" value="' + (v == null ? "" : v) + '" aria-label="Nota em porcentagem: ' + esc(L.t) + '">%</span>' + (prev ? '<span class="score-prev">antes ' + prev.p + "%</span>" : "") + "</label>";
  }).join("");
  const box = '<div class="scores' + (multi ? " multi" : "") + '">' + rows + "</div>";
  if (t.sc.length <= 4) return box;
  const filled = t.sc.filter(id => scoreFor(id, t.k) != null).length;
  return '<details class="score-more" data-det="' + esc(t.k) + '"' + (openDetails.has(t.k) ? " open" : "") + "><summary>Anotar as notas (" + filled + " de " + t.sc.length + ")</summary>" + box + "</details>";
}
export function trackDetails(e){
  const d = e.target;
  if (d && d.dataset && d.dataset.det){ if (d.open) openDetails.add(d.dataset.det); else openDetails.delete(d.dataset.det); }
}
function revHTML(t){
  if (!t.rev) return "";
  const r = lowLessons(t.rev);
  let h = "";
  if (r.low.length) h += '<p class="task-note">Pelas suas notas, refaça ' + (r.low.length === 1 ? "esta" : "estas " + r.low.length) + ':</p><ul class="lowlist">' + r.low.map(x => '<li><a href="' + esc(LES[x[0]].u) + '" target="_blank" rel="noopener">' + esc(LES[x[0]].t) + "</a><span>" + x[1] + "%</span></li>").join("") + "</ul>";
  else if (r.none.length < t.rev.length) h += '<p class="task-note">Nenhuma lição deste bloco ficou abaixo de 80%. Use o tempo com o prompt 8 nos tópicos que parecem mais fracos.</p>';
  if (r.none.length === t.rev.length) h += '<p class="task-note">Nenhuma nota registrada neste bloco. Escolha pelos tópicos que você sente mais fracos e, daqui para a frente, anote as notas nas tarefas.</p>';
  else if (r.none.length) h += '<p class="task-note">' + r.none.length + (r.none.length === 1 ? " lição do bloco ainda está sem nota." : " lições do bloco ainda estão sem nota.") + "</p>";
  return h;
}

export function focusHTML(n){
  const p = PH[phaseOf(n)];
  const ms = weekMilestone(n), note = weekNote(n);
  let h = '<div class="focus" style="--pc:var(' + p.col + ')"><dl>';
  h += '<dt>Flashcards</dt><dd>' + esc(p.cards) + "</dd>";
  h += "<dt>ChatGPT</dt><dd>" + esc(p.gpt) + "</dd>";
  if (ms) h += '<dt>Checkpoint</dt><dd class="ms">' + esc(ms) + "</dd>";
  if (note) h += "<dt>Nota</dt><dd>" + esc(note) + "</dd>";
  if (p.tweak) h += "<dt>Ajuste</dt><dd>" + esc(p.tweak) + "</dd>";
  return h + "</dl></div>";
}

export function logLi(e){
  const s = sk(e.skill);
  return '<li><span class="d">' + esc(shortDate(e.date)) + '</span><span class="mid"><span class="tag c-' + s.c + '">' + s.n + "</span>" + (e.note ? ' <span class="n">' + esc(e.note) + "</span>" : "") + '</span><span class="num">' + e.min + ' min</span><button class="x" type="button" data-act="log-del" data-id="' + esc(e.id) + '" aria-label="Apagar registro de ' + e.min + " min de " + s.n + '">×</button></li>';
}

/* ---------- logging helpers ---------- */
export function logTask(task, min, note){
  const parts = task.mix ? splitMix(task.mix, min) : [[task.s, min]];
  return parts.filter(p => p[1] > 0).map(p => addLog({date: today(), min: p[1], skill: p[0], note: note || (task.bc ? task.k + " " + task.t : task.t.slice(0, 90)), task: task.k}));
}
function splitMix(mix, min){
  const total = mix.reduce((a, p) => a + p[1], 0) || 1;
  let left = min;
  return mix.map((p, i) => { const v = i === mix.length - 1 ? left : Math.round(min * p[1] / total); left -= v; return [p[0], v]; });
}
const logged = ens => ens.map(en => en.min + " min de " + sk(en.skill).n).join(" e ");
function undoLogs(ens){ return {label: "Desfazer", fn: () => ens.forEach(en => deleteLog(en.id))}; }

/* Marks a task as done and celebrates week/phase changes. */
export function setDone(key, on, el){
  const before = currentRoadmapWeek();
  update(s => { if (on) s.done[key] = today(); else delete s.done[key]; });
  const after = currentRoadmapWeek();
  if (on && after > before){
    const ph = phaseOf(after) > phaseOf(before);
    confetti(null, true);
    toast(ph ? "Começa a fase " + phaseOf(after) + ": " + PH[phaseOf(after)].name + "." : "Rumo à semana " + after + ".", [], {title: ph ? "Fase " + phaseOf(before) + " concluída!" : "Semana " + before + " fechada!", tone: "warm", ms: 6000});
    return true;
  }
  if (on && el) confetti(el);
  return false;
}

export const taskActions = {
  "task-toggle"(el){
    const key = el.dataset.task, task = TASKS.get(key);
    if (el.checked) el.classList.add("pop");
    const big = setDone(key, el.checked, el);
    if (!el.checked || !task || big) return;
    const already = S.logs.some(e => e.task === key && e.date === today());
    const run = timer.running();
    if (already || (run && run.task === key) || !task.m) return;
    const what = task.mix ? task.mix.map(p => p[1] + " min de " + sk(p[0]).n).join(" e ") : task.m + " min de " + sk(task.s).n;
    toast("Feito! Registrar " + what + "?", [{label: "Registrar", fn: () => { const ens = logTask(task, task.m); toast("Registrado: " + logged(ens) + ".", [undoLogs(ens)]); }}]);
  },
  score(el){
    const raw = String(el.value).trim();
    let p = null;
    if (raw !== ""){
      p = Math.round(Number(raw));
      if (!(p >= 0 && p <= 100)){ toast("Use uma nota de 0 a 100."); el.value = scoreFor(el.dataset.score, el.dataset.sk) ?? ""; return; }
    }
    update(s => setScore(s, el.dataset.score, el.dataset.sk, p));
  },
  "task-start"(el){
    const task = TASKS.get(el.dataset.task);
    if (!task) return;
    const run = timer.running();
    if (run){ toast("Já tem um cronômetro rodando: " + run.label + ". Pare ele primeiro."); return; }
    timer.start({skill: task.s, task: task.k, label: task.t, mix: task.mix || null, m: task.m});
    if (task.u && task.u.charAt(0) !== "#") toast("Cronômetro iniciado. Bom estudo!", [{label: "Abrir lição", fn: () => window.open(task.u, "_blank", "noopener")}]);
    else toast("Cronômetro iniciado. Bom estudo!");
  },
  "log-del"(el){
    const en = deleteLog(el.dataset.id);
    if (en) toast("Registro apagado.", [{label: "Desfazer", fn: () => restoreLog(en)}]);
  }
};

/* Called by the timer bar's stop button. */
export function stopTimer(){
  const t = timer.stop();
  if (!t) return;
  if (t.min < 1){ toast("Menos de 1 minuto, nada registrado."); return; }
  const min = Math.min(600, t.min);
  const task = t.task ? (TASKS.get(t.task) || {k: t.task, s: t.skill, t: t.label, mix: t.mix, m: t.m}) : null;
  const ens = task ? logTask(task, min) : [addLog({date: today(), min, skill: t.skill, note: t.label || "cronômetro"})];
  if (task && !S.state.done[task.k]){
    toast("Registrado: " + logged(ens) + ". Terminou “" + task.t + "”?", [{label: "Concluir tarefa", fn: () => setDone(task.k, true)}, undoLogs(ens)], {ms: 12000});
  } else toast("Registrado: " + logged(ens) + ".", [undoLogs(ens)]);
}
