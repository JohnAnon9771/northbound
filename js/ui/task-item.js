// A route task as a list item: checkbox, link, minutes, score inputs and the "Começar" button (Hoje and Rota).
import { S } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import * as timer from "../core/study-timer.js";
import { LESSONS, LESSON_INDEXES } from "../data/lessons.js";
import { skillOf } from "../data/skills.js";
import { scoreFor, latestScore, lowLessons } from "../domain/lesson-scores.js";

// every task rendered in the current view, by key, for the actions below
const TASKS = new Map();
export const resetTasks = () => TASKS.clear();
export const taskByKey = k => TASKS.get(k);

export function taskHTML(t, opts){
  const o = opts || {};
  TASKS.set(t.k, t);
  const done = !!S.state.done[t.k], c = skillOf(t.s).c;
  const run = timer.running();
  const isRunning = run && run.task === t.k;
  const ext = t.u && t.u.charAt(0) !== "#";
  const title = t.u ? '<a class="task-title" href="' + esc(t.u) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(t.t) + "</a>" : '<span class="task-title">' + esc(t.t) + "</span>";
  const meta = t.mix ? t.mix.map(p => '<span class="tag c-' + skillOf(p[0]).c + '">' + skillOf(p[0]).n + "</span>") : ['<span class="tag c-' + c + '">' + skillOf(t.s).n + "</span>"];
  if (t.m) meta.push("<span>" + (t.mix ? t.m + " min (" + t.mix.map(p => p[1]).join(" + ") + ")" : t.m + " min") + "</span>");
  if (t.bc) meta.push("<span>" + esc(t.k) + "</span>");
  if (t.idx) meta.push('<a href="' + LESSON_INDEXES[t.idx][1] + '" target="_blank" rel="noopener">' + LESSON_INDEXES[t.idx][0] + "</a>");
  const start = o.start && !done && t.m ? '<button class="btn btn-small ' + (isRunning ? "btn-soft" : "btn-ghost") + ' task-start" type="button" data-act="task-start" data-task="' + esc(t.k) + '"' + (isRunning ? " disabled" : "") + ">" + (isRunning ? "Em andamento" : icon("play", 14) + "Começar") + "</button>" : "";
  return '<li class="task' + (done ? " done" : "") + (t.ms ? " milestone" : "") + (isRunning ? " running" : "") + '"><input type="checkbox" class="chk" data-change="task-toggle" data-task="' + esc(t.k) + '" data-fk="task-' + esc(t.k) + '"' + (done ? " checked" : "") + ' aria-label="Concluir: ' + esc(t.t) + '"><div class="task-body">' + title + '<div class="task-meta">' + meta.join("") + "</div>" + (t.n && !o.compact ? '<p class="task-note">' + esc(t.n) + "</p>" : "") + revHTML(t) + scoreHTML(t) + "</div>" + start + "</li>";
}

const openDetails = new Set();
export const isOpen = key => openDetails.has(key);
function scoreHTML(t){
  if (!t.sc || !t.sc.length) return "";
  const multi = t.sc.length > 1;
  const rows = t.sc.map(id => {
    const L = LESSONS[id], v = scoreFor(S.state.scores, id, t.k), prev = latestScore(S.state.scores, id, t.k);
    const name = multi ? L.t : (L.s === "gram" ? "Nota do Grammar test 2" : "Nota");
    return '<label class="score"><span class="score-n">' + esc(name) + '</span><span class="score-in"><input type="number" min="0" max="100" step="1" inputmode="numeric" data-change="score" data-score="' + esc(id) + '" data-sk="' + esc(t.k) + '" data-fk="sc-' + esc(id) + "-" + esc(t.k) + '" value="' + (v == null ? "" : v) + '" aria-label="Nota em porcentagem: ' + esc(L.t) + '">%</span>' + (prev ? '<span class="score-prev">antes ' + prev.p + "%</span>" : "") + "</label>";
  }).join("");
  const box = '<div class="scores' + (multi ? " multi" : "") + '">' + rows + "</div>";
  if (t.sc.length <= 4) return box;
  const filled = t.sc.filter(id => scoreFor(S.state.scores, id, t.k) != null).length;
  return '<details class="score-more" data-det="' + esc(t.k) + '"' + (openDetails.has(t.k) ? " open" : "") + "><summary>Anotar as notas (" + filled + " de " + t.sc.length + ")</summary>" + box + "</details>";
}
export function trackDetails(e){
  const d = e.target;
  if (d && d.dataset && d.dataset.det){ if (d.open) openDetails.add(d.dataset.det); else openDetails.delete(d.dataset.det); }
}
function revHTML(t){
  if (!t.rev) return "";
  const r = lowLessons(S.state.scores, t.rev);
  let h = "";
  if (r.low.length) h += '<p class="task-note">Pelas suas notas, refaça ' + (r.low.length === 1 ? "esta" : "estas " + r.low.length) + ':</p><ul class="lowlist">' + r.low.map(x => '<li><a href="' + esc(LESSONS[x[0]].u) + '" target="_blank" rel="noopener">' + esc(LESSONS[x[0]].t) + "</a><span>" + x[1] + "%</span></li>").join("") + "</ul>";
  else if (r.none.length < t.rev.length) h += '<p class="task-note">Nenhuma lição deste bloco ficou abaixo de 80%. Use o tempo com o prompt 8 nos tópicos que parecem mais fracos.</p>';
  if (r.none.length === t.rev.length) h += '<p class="task-note">Nenhuma nota registrada neste bloco. Escolha pelos tópicos que você sente mais fracos e, daqui para a frente, anote as notas nas tarefas.</p>';
  else if (r.none.length) h += '<p class="task-note">' + r.none.length + (r.none.length === 1 ? " lição do bloco ainda está sem nota." : " lições do bloco ainda estão sem nota.") + "</p>";
  return h;
}
