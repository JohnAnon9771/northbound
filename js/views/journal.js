// Diário: each ChatGPT conversation and text correction, with the feedback pasted from the chat,
// this week's count against the phase goal and how the scores move over time.
import { S, update, addLog } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { uid } from "../core/id.js";
import { today, shortDate } from "../core/date.js";
import { toast } from "../core/toast.js";
import { rerender } from "../core/rerender.js";
import { CRIT, normalizeFeedback } from "../state/schema.js";
import { weekTasks } from "../domain/week-tasks.js";
import { currentRoadmapWeek } from "../domain/pace.js";
import { parseFeedback, errKey, CRIT_NAMES, countForTask, sessionsFor, trend, latestLevel, repeatErrors, grammarTop, insights } from "../domain/gpt-feedback.js";
import { setDone } from "../ui/task-actions.js";
import { lineChart, CRIT_COLORS as COLORS } from "../ui/score-chart.js";

const LEVELS = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C1+", "C2"];
const KIND = {conv: "Conversa", writ: "Writing"};
const nf = v => v.toLocaleString("pt-BR", {maximumFractionDigits: 1});
// time is added to the study log unless the task's timer logged it after the last Diário entry
// (the Diário's own logs carry no task key, so they never count here)
function logTime(){
  if (d.logTime != null) return d.logTime;
  if (!d.task) return true;
  const last = S.state.feedback.reduce((a, e) => e.task === d.task ? Math.max(a, e.ts || 0) : a, 0);
  return !S.logs.some(l => l.task === d.task && l.date === d.date && (l.ts || 0) > last);
}

let d = null;   // the form draft, kept across re-renders
const blank = (kind, task) => ({kind, task, date: today(), min: kind === "conv" ? 30 : "", topic: "", feel: null, raw: "", level: "", crit: {}, errs: [], grammar: "", logTime: null});

// tasks of the current route week that take a Diário entry of this kind
const weekFb = kind => weekTasks(currentRoadmapWeek()).filter(t => t.fb && t.fb.kind === kind);
function defaultTask(kind){
  const ts = weekFb(kind);
  const open = ts.find(t => kind === "conv" ? countForTask(S.state.feedback, t.k) < (t.fb.n || 1) : !countForTask(S.state.feedback, t.k));
  return (open || ts[0] || {}).k || "";
}
function taskFor(key){
  if (!key) return null;
  const rw = currentRoadmapWeek();
  for (let n = rw; n >= Math.max(1, rw - 8); n--){ const t = weekTasks(n).find(x => x.k === key); if (t) return t; }
  return null;
}
function fromHash(){
  const q = new URLSearchParams(location.hash.split("?")[1] || ""), key = q.get("task");
  const t = taskFor(key);
  if (t && t.fb) return blank(t.fb.kind, t.k);
  return d || blank("conv", defaultTask("conv"));
}

/* ---------- form ---------- */
function feelHTML(){
  return '<div class="field"><span class="lbl">Como você se sentiu</span><span class="seg" role="group" aria-label="Como você se sentiu, de 1 a 5">' +
    [1, 2, 3, 4, 5].map(v => '<button type="button" data-act="fb-feel" data-v="' + v + '" data-fk="fb-feel-' + v + '" aria-pressed="' + (d.feel === v) + '">' + v + "</button>").join("") + '</span><p class="hint">1 travei muito, 5 falei solto.</p></div>';
}
function taskSelect(){
  const ts = weekFb(d.kind);
  const cur = d.task && !ts.some(t => t.k === d.task) ? taskFor(d.task) : null;
  const opts = (cur ? [cur] : []).concat(ts).map(t => {
    const n = countForTask(S.state.feedback, t.k);
    const extra = d.kind === "conv" ? " (" + n + " de " + (t.fb.n || 1) + ")" : n ? " (já corrigido)" : "";
    return '<option value="' + esc(t.k) + '"' + (t.k === d.task ? " selected" : "") + ">" + esc(t.t.replace(/^ChatGPT: /, "")) + extra + "</option>";
  });
  opts.push('<option value=""' + (d.task ? "" : " selected") + ">Avulsa, fora da rota</option>");
  return '<div class="field"><label for="fbTask">Tarefa da semana</label><select id="fbTask" name="task" data-change="fb-task">' + opts.join("") + "</select></div>";
}
function previewHTML(){
  const keys = CRIT[d.kind];
  let h = '<div class="fb-preview"><div class="row">';
  h += '<div class="field"><label for="fbLevel">Nível estimado</label><select id="fbLevel" name="level" data-change="fb-field"><option value="">–</option>' + LEVELS.map(l => "<option" + (l === d.level ? " selected" : "") + ">" + l + "</option>").join("") + "</select></div>";
  h += '<div class="field"><span class="lbl">Notas de 0 a 5</span><div class="fb-crit">' + keys.map(k => '<label class="score"><span class="score-n">' + CRIT_NAMES[k] + '</span><span class="score-in"><input type="number" min="0" max="5" step="0.5" inputmode="decimal" data-input="fb-crit" data-k="' + k + '" data-fk="fb-crit-' + k + '" value="' + (d.crit[k] == null ? "" : d.crit[k]) + '" aria-label="' + CRIT_NAMES[k] + ' de 0 a 5"></span></label>').join("") + "</div></div></div>";
  if (d.errs.length){
    const known = new Set(S.state.errors.map(e => errKey(e.wrong)));
    h += '<div class="field"><span class="lbl">Erros encontrados</span><ul class="errs fb-errs">' + d.errs.map((e, i) => '<li><span><span class="wrong">' + esc(e.wrong) + '</span><br><span class="right">' + esc(e.right) + '</span></span><label class="fb-chk"><input type="checkbox" data-change="fb-err" data-i="' + i + '" data-fk="fb-err-' + i + '"' + (e.on ? " checked" : "") + "> " + (known.has(errKey(e.wrong)) ? "+1 nos recorrentes" : "Mandar para os recorrentes") + "</label></li>").join("") + "</ul></div>";
  } else if (d.raw.trim()) h += '<p class="hint">Nenhum erro no formato “o que eu disse → o certo”. Use o bloco final dos prompts 2, 3 ou 4.</p>';
  h += '<div class="field"><label for="fbGram">Ponto de gramática</label><input type="text" id="fbGram" name="grammar" data-input="fb-field" data-fk="fbGram" maxlength="160" value="' + esc(d.grammar) + '" placeholder="Past simple vs present perfect"></div>';
  return h + "</div>";
}
function formHTML(){
  const conv = d.kind === "conv";
  let h = '<section class="card section" aria-labelledby="hFbForm"><div class="card-head"><h2 id="hFbForm">Registrar</h2><span class="seg" role="group" aria-label="Tipo">' +
    ["conv", "writ"].map(k => '<button type="button" data-act="fb-kind" data-k="' + k + '" aria-pressed="' + (d.kind === k) + '">' + KIND[k] + "</button>").join("") + "</span></div>";
  h += '<form data-submit="fb-save">' + taskSelect();
  h += '<div class="row"><div class="field"><label for="fbDate">Data</label><input type="date" id="fbDate" name="date" data-input="fb-field" data-fk="fbDate" value="' + esc(d.date) + '"></div>' +
    '<div class="field"><label for="fbMin">Minutos</label><input type="number" id="fbMin" name="min" min="0" max="600" inputmode="numeric" data-input="fb-field" data-fk="fbMin" value="' + esc(String(d.min)) + '"></div></div>';
  h += '<div class="field"><label for="fbTopic">' + (conv ? "Tema da conversa" : "Texto sobre") + '</label><input type="text" id="fbTopic" name="topic" data-input="fb-field" data-fk="fbTopic" maxlength="120" value="' + esc(d.topic) + '" placeholder="' + (conv ? "Minha rotina, o fim de semana passado…" : "E-mail para um amigo…") + '"></div>';
  if (conv) h += feelHTML();
  h += '<div class="field"><label for="fbRaw">Cole o feedback do ChatGPT</label><textarea id="fbRaw" name="raw" data-input="fb-raw" data-fk="fbRaw" rows="6" placeholder="Level: A2+&#10;Scores: fluency 3/5, grammar 2/5, vocabulary 3/5, coherence 3/5&#10;Errors:&#10;I go to the beach yesterday → I went to the beach yesterday&#10;Grammar point: past simple">' + esc(d.raw) + '</textarea><p class="hint">Use o prompt ' + (conv ? "2 ou 3" : "4") + ' de <a href="#rotinas">Rotinas</a>: ele termina com um bloco pronto para colar aqui. O que der para ler vira nível, notas e erros abaixo, e dá para corrigir à mão.</p></div>';
  h += previewHTML();
  const min = Number(d.min) || 0;
  if (min > 0) h += '<label class="fb-chk log"><input type="checkbox" data-change="fb-log" data-fk="fb-log"' + (logTime() ? " checked" : "") + "> Somar " + min + " min de " + (conv ? "Conversa" : "Writing") + " ao tempo de estudo</label>";
  return h + '<button class="btn" type="submit">Salvar ' + (conv ? "conversa" : "correção") + "</button></form></section>";
}

/* ---------- this week and progress ---------- */
function weekHTML(){
  const rw = currentRoadmapWeek(), fb = S.state.feedback;
  const conv = weekFb("conv"), writ = weekFb("writ");
  let h = '<section class="card section"><h2>Semana ' + (rw >= 53 ? "C1" : rw) + " da rota</h2><div class=\"stack\">";
  conv.forEach(t => {
    const n = countForTask(fb, t.k), goal = t.fb.n || 1;
    h += '<div><b>Conversas</b><div class="fb-line"><span class="fb-dots" aria-hidden="true">' + Array.from({length: Math.max(goal, n)}, (_, i) => '<i class="' + (i < n ? "on" : "") + '"></i>').join("") + "</span><span>" + n + " de " + goal + (S.state.done[t.k] ? ", tarefa concluída" : "") + "</span></div></div>";
  });
  if (writ.length) h += '<div><b>Textos corrigidos</b><ul class="plain fb-week">' + writ.map(t => { const e = fb.filter(x => x.task === t.k).pop(); return "<li>" + (e ? "✓ " : "○ ") + esc(t.t) + (e && e.level ? ' <span class="pill">' + esc(e.level) + "</span>" : "") + "</li>"; }).join("") + "</ul></div>";
  if (!conv.length && !writ.length) h += '<p class="muted">Esta semana da rota não tem conversa nem writing.</p>';
  return h + "</div></section>";
}

function kindBlock(kind, title){
  const ss = sessionsFor(S.state.feedback, kind), lv = latestLevel(S.state.feedback, kind);
  let h = '<div class="fb-kind"><div class="card-head"><h3>' + title + '</h3><span class="muted">' + ss.length + (ss.length === 1 ? " registro" : " registros") + (lv ? ' · nível mais recente <b>' + esc(lv.level) + "</b>" : "") + "</span></div>";
  if (!ss.some(e => Object.keys(e.crit).length)) return h + '<p class="muted">As notas de 0 a 5 aparecem aqui quando o feedback colado trouxer a linha “Scores”.</p></div>';
  h += lineChart(ss.filter(e => Object.keys(e.crit).length), CRIT[kind].map(k => ({k, name: CRIT_NAMES[k], color: COLORS[k]})), "Notas de " + title.toLowerCase() + " ao longo do tempo");
  const t = trend(S.state.feedback, kind);
  h += '<div class="summary-line">' + t.map(x => '<span class="pill">' + CRIT_NAMES[x.k] + " " + nf(x.now) + (x.before == null ? "" : x.now - x.before >= 0.25 ? " ↑" : x.now - x.before <= -0.25 ? " ↓" : " =") + "</span>").join("") + "</div>";
  return h + "</div>";
}
function progressHTML(){
  const fb = S.state.feedback;
  let h = '<section class="card section" aria-labelledby="hFbProg"><h2 id="hFbProg">Evolução</h2>';
  if (!fb.length) return h + '<p class="muted">Registre a primeira conversa para ver aqui a contagem, as notas e os erros que se repetem.</p></section>';
  const conv = weekFb("conv")[0];
  const tips = insights(fb, conv ? {done: countForTask(fb, conv.k), goal: conv.fb.n || 1} : null);
  if (tips.length) h += '<ul class="plain fb-tips">' + tips.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>";
  h += kindBlock("conv", "Conversas") + kindBlock("writ", "Textos");
  const rep = repeatErrors(fb).slice(0, 6);
  if (rep.length){
    const known = new Set(S.state.errors.map(e => errKey(e.wrong)));
    h += '<h3 class="fb-h">Erros que voltam</h3><ul class="errs">' + rep.map(r => '<li><span><span class="wrong">' + esc(r.wrong) + '</span><br><span class="right">' + esc(r.right) + '</span></span><span class="cnt">' + r.n + " sessões</span>" + (known.has(errKey(r.wrong)) ? '<span class="pill pill-sage">nos recorrentes</span>' : '<button class="btn btn-ghost btn-small" type="button" data-act="fb-adderr" data-w="' + esc(r.wrong) + '" data-r="' + esc(r.right) + '">Mandar para os recorrentes</button>') + "</li>").join("") + "</ul>";
  }
  const gt = grammarTop(fb, 5);
  if (gt.length) h += '<h3 class="fb-h">Gramática que o ChatGPT mais pediu para revisar</h3><ul class="split">' + gt.map(g => "<li><span>" + esc(g.t) + "</span><span>" + g.n + "×</span></li>").join("") + "</ul>";
  return h + "</section>";
}

function historyHTML(){
  const list = S.state.feedback.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0));
  let h = '<section class="section"><h2>Histórico</h2>';
  if (!list.length) return h + '<p class="muted">Nada registrado ainda.</p></section>';
  h += '<ul class="fb-hist">';
  list.slice(0, 40).forEach(e => {
    const c = CRIT[e.kind].filter(k => e.crit[k] != null).map(k => CRIT_NAMES[k] + " " + nf(e.crit[k])).join(" · ");
    h += '<li><div class="fb-hist-head"><span class="d">' + esc(shortDate(e.date)) + '</span><span class="tag c-out">' + KIND[e.kind] + "</span><b>" + esc(e.topic || "sem tema") + "</b>" + (e.level ? '<span class="pill">' + esc(e.level) + "</span>" : "") + '<button class="x" type="button" data-act="fb-del" data-id="' + esc(e.id) + '" aria-label="Apagar registro">×</button></div>' +
      '<div class="task-meta">' + (e.min ? "<span>" + e.min + " min</span>" : "") + (e.feel ? "<span>sensação " + e.feel + "/5</span>" : "") + (c ? "<span>" + c + "</span>" : "") + "<span>" + e.errs.length + (e.errs.length === 1 ? " erro" : " erros") + "</span></div>";
    if (e.errs.length || e.raw || e.grammar) h += "<details><summary>Ver feedback</summary>" + (e.errs.length ? '<ul class="errs">' + e.errs.map(x => '<li><span><span class="wrong">' + esc(x.wrong) + '</span><br><span class="right">' + esc(x.right) + "</span></span></li>").join("") + "</ul>" : "") + (e.grammar ? '<p class="task-note">Gramática: ' + esc(e.grammar) + "</p>" : "") + (e.raw ? '<p class="prompt-text fb-raw">' + esc(e.raw) + "</p>" : "") + "</details>";
    h += "</li>";
  });
  return h + "</ul></section>";
}

function addError(s, wrong, right){
  const x = s.errors.find(e => errKey(e.wrong) === errKey(wrong));
  if (x) x.count = (x.count || 1) + 1;
  else s.errors.push({id: uid(), wrong, right, count: 1});
}

export default {
  id: "diario",
  title: "Diário",
  enter(){ d = fromHash(); },
  render(){
    if (!d) d = fromHash();
    return '<header class="page-head"><div><a class="eyebrow back" href="#mais">' + icon("back", 14) + 'Mais</a><h1>Diário de conversas e textos</h1><p class="lead">Cada conversa e cada texto corrigido no ChatGPT, com o feedback do fim. É aqui que dá para ver se a fala e a escrita estão subindo. Para uma medida da fala comparável no tempo, use o <a href="#fala">teste de fala</a>.</p></div></header>' +
      '<div class="grid-2">' + formHTML() + weekHTML() + "</div>" + progressHTML() + historyHTML();
  },
  actions: {
    "fb-kind"(el){ const k = el.dataset.k; if (k === d.kind) return; d = Object.assign(blank(k, defaultTask(k)), {date: d.date, raw: ""}); rerender(); },
    "fb-task"(el){ d.task = el.value; rerender(); },
    "fb-field"(el){ d[el.name] = el.value; if (el.name === "min") rerender(); },
    "fb-feel"(el){ const v = Number(el.dataset.v); d.feel = d.feel === v ? null : v; rerender(); },
    "fb-crit"(el){ const v = el.value.trim(); if (v === "") delete d.crit[el.dataset.k]; else d.crit[el.dataset.k] = Number(v.replace(",", ".")); },
    "fb-err"(el){ const e = d.errs[Number(el.dataset.i)]; if (e) e.on = el.checked; },
    "fb-log"(el){ d.logTime = el.checked; },
    "fb-raw"(el){
      d.raw = el.value;
      const p = parseFeedback(d.raw, d.kind);
      d.level = p.level || d.level; d.grammar = p.grammar || d.grammar;
      if (Object.keys(p.crit).length) d.crit = p.crit;
      d.errs = p.errs.map(e => ({wrong: e.wrong, right: e.right, on: true}));
      rerender();
    },
    "fb-save"(){
      const e = normalizeFeedback({id: uid(), kind: d.kind, date: d.date, task: d.task, topic: d.topic, min: d.min, feel: d.feel, level: d.level, crit: d.crit, errs: d.errs, grammar: d.grammar, raw: d.raw, ts: Date.now()});
      if (!e){ toast("Confira a data."); return; }
      if (!e.topic && !e.raw && !e.min){ toast("Preencha pelo menos o tema, os minutos ou o feedback."); return; }
      const sent = d.errs.filter(x => x.on), addTime = logTime();
      update(s => { s.feedback.push(e); sent.forEach(x => addError(s, x.wrong, x.right)); });
      const t = taskFor(e.task);
      if (addTime && e.min) addLog({date: e.date, min: e.min, skill: e.kind, note: (e.kind === "conv" ? "Conversa: " : "Writing: ") + (e.topic || (t ? t.t : "ChatGPT")).slice(0, 80)});
      const kind = d.kind;
      d = blank(kind, defaultTask(kind));
      let msg = kind === "conv" ? "Conversa salva." : "Correção salva.";
      if (sent.length) msg += " " + sent.length + (sent.length === 1 ? " erro foi para os recorrentes." : " erros foram para os recorrentes.");
      if (t && t.fb && kind === "conv"){
        const n = countForTask(S.state.feedback, t.k), goal = t.fb.n || 1;
        if (n >= goal && !S.state.done[t.k]){ if (setDone(t.k, true)) return; msg += " Meta da semana cumprida: tarefa concluída."; }
        else if (n < goal) msg += " " + n + " de " + goal + " nesta semana.";
      }
      toast(msg);
      window.scrollTo(0, 0);
    },
    "fb-adderr"(el){ update(s => addError(s, el.dataset.w, el.dataset.r)); toast("“" + el.dataset.r + "” entrou nos erros recorrentes."); },
    "fb-del"(el){
      const x = S.state.feedback.find(e => e.id === el.dataset.id);
      if (!x) return;
      update(s => { s.feedback = s.feedback.filter(e => e.id !== x.id); });
      toast("Registro apagado.", [{label: "Desfazer", fn: () => update(s => { s.feedback.push(x); })}]);
    }
  }
};
