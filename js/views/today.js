// Hoje: one clear next step, today's short plan, progress ring, streak and the phrase of the day.
import { S, addLog, updateQuiet } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { plural } from "../core/format.js";
import { today, longDate, mondayOf, addDays, DIAS } from "../core/date.js";
import { toast } from "../core/toast.js";
import { rerender } from "../core/rerender.js";
import * as timer from "../core/study-timer.js";
import { SKILLS, SKILL_ORDER, skillOf } from "../data/skills.js";
import { PHASES, phaseOf } from "../data/phases.js";
import { weekTasks } from "../domain/week-tasks.js";
import { extraTasks } from "../domain/goal-extras.js";
import { currentRoadmapWeek, calWeekOf, calWeekStart, paceText } from "../domain/pace.js";
import { minutesByDate, streak } from "../domain/stats.js";
import { planDay, nextOpen } from "../domain/daily-plan.js";
import { deckToday, phraseOfDay } from "../flashcards/deck.js";
import { studyStatus } from "../ui/study-status.js";
import { dailyWordsHint } from "../ui/daily-words-card.js";
import { taskHTML, isOpen } from "../ui/task-item.js";
import { logLi } from "../ui/log-list.js";
import { highlight } from "../ui/word-text.js";
import { speakBtn } from "../ui/speech.js";

const LS_SKILL = "nb:lastSkill";
let lastSkill = "gram";
try { const v = localStorage.getItem(LS_SKILL); if (v && SKILLS[v]) lastSkill = v; } catch (e){}

function greeting(){
  const h = new Date().getHours();
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function weekTaskList(rw){ return weekTasks(rw).concat(extraTasks(rw)); }

function todayPlan(rw){
  const t = today();
  const tasks = weekTaskList(rw);
  const cw = calWeekOf(t);
  const mondayISO = cw > 0 ? calWeekStart(cw) : mondayOf(new Date());
  const args = {tasks, done: S.state.done, todayISO: t, mondayISO, dayMap: minutesByDate(S.logs), prev: S.state.dayPlan};
  let plan = planDay(args);
  // the stored plan may point to last week's tasks after you closed a week today
  if (!plan.keys.length && tasks.some(x => !S.state.done[x.k])) plan = planDay(Object.assign(args, {prev: null}));
  if (plan.fresh || !S.state.dayPlan || S.state.dayPlan.date !== t || S.state.dayPlan.keys.join() !== plan.keys.join()) updateQuiet(s => { s.dayPlan = {date: t, keys: plan.keys}; });
  return {tasks, list: plan.keys.map(k => tasks.find(x => x.k === k)).filter(Boolean)};
}

// minutes ring: a thin arc on a track, with a tick for every 10 minutes of the daily goal
function ring(min, goal){
  const r = 46, C = 2 * Math.PI * r, f = Math.min(1, goal ? min / goal : 0);
  const n = Math.max(1, Math.round(goal / 10)), tr = 55, TC = 2 * Math.PI * tr;
  return '<div class="ring' + (f >= 1 ? " full" : "") + '" role="img" aria-label="' + min + " de " + goal + ' minutos hoje"><svg viewBox="0 0 120 120">' +
    '<circle class="ticks" cx="60" cy="60" r="' + tr + '" fill="none" stroke-width="3" stroke-dasharray="1 ' + (TC / n - 1).toFixed(2) + '"/>' +
    '<circle class="track" cx="60" cy="60" r="' + r + '" fill="none" stroke-width="5"/><circle class="val" cx="60" cy="60" r="' + r + '" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - f)).toFixed(1) + '"/></svg>' +
    '<div class="ring-label"><b class="num">' + min + "</b><small>de " + goal + " min</small></div></div>";
}

// this calendar week, Monday first: a dot per day, filled when you studied
function weekRibbon(dayMap, t){
  const mon = mondayOf(new Date());
  let h = '<ol class="ribbon" aria-label="Dias estudados nesta semana">';
  for (let i = 0; i < 7; i++){
    const d = addDays(mon, i), on = dayMap.get(d) > 0, cls = (on ? "on" : "") + (d === t ? " today" : "") + (d > t ? " fut" : "");
    h += '<li class="' + cls.trim() + '"><i></i><span>' + DIAS[(i + 1) % 7].charAt(0).toUpperCase() + '</span><span class="sr">' + (on ? "estudou" : "não estudou") + "</span></li>";
  }
  return h + "</ol>";
}

function nextStep(deck, list){
  if (deck.due > 0) return {eyebrow: "Comece por aqui", title: "Revisar " + plural(deck.due, "cartão", "cartões"), sub: "Cerca de " + deck.minutes + " min. Revisões vêm antes de palavras novas: são elas que seguram o vocabulário.", btn: icon("cards", 18) + "Começar revisão", href: "#estudo"};
  if (deck.fresh > 0) return {eyebrow: "Comece por aqui", title: "Aprender " + plural(deck.fresh, "palavra nova", "palavras novas"), sub: "Revisões em dia. Hora de colocar vocabulário novo na rotação.", btn: icon("cards", 18) + "Estudar palavras", href: "#estudo"};
  const open = list.find(t => !S.state.done[t.k]);
  if (open){
    const run = timer.running();
    if (run && run.task === open.k) return {eyebrow: run.paused ? "Em pausa" : "Em andamento", title: open.t, sub: run.paused ? "O cronômetro está pausado e a pausa não conta como estudo. Toque em ▶ lá embaixo para continuar." : "O cronômetro está rodando. Quando terminar, toque em Parar lá embaixo.", btn: null};
    return {eyebrow: "Próximo passo", title: open.t, sub: skillOf(open.s).n + (open.m ? " · cerca de " + open.m + " min" : ""), btn: icon("play", 16) + "Começar agora", act: "task-start", task: open.k};
  }
  const dw = dailyWordsHint();
  if (dw) return {eyebrow: "Próximo passo", title: "Palavras do dia (" + dw.level + "): " + plural(dw.n, "pronta", "prontas") + " para adicionar", sub: "As mais usadas do seu nível que você ainda não tem. Marque as que já sabe e adicione o resto.", btn: icon("plus", 18) + "Ver palavras", href: "#palavras"};
  if (!S.cards.length) return {eyebrow: "Primeiro passo", title: "Adicione suas primeiras palavras", sub: "Escreva uma palavra ou expressão e o site busca tradução e exemplos de uso.", btn: icon("plus", 18) + "Adicionar palavras", href: "#palavras"};
  return {eyebrow: "Dia completo", title: "Tudo feito por hoje. Muito bem!", sub: "Descanse, ou adiante uma tarefa da semana se estiver com energia.", btn: icon("plus", 18) + "Adiantar uma tarefa", act: "plan-more", tone: "sage"};
}

const ORNAMENT = '<svg class="plate-ornament" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="70" stroke-dasharray="2 5"/><path d="M100 14v172M14 100h172M39 39l122 122M161 39 39 161" stroke-width=".6"/><path d="M100 24 86 100l14 76 14-76z" fill="currentColor" stroke="none"/></svg>';
function heroHTML(n){
  const btn = !n.btn ? "" : n.href ? '<a class="btn" href="' + n.href + '">' + n.btn + "</a>" : '<button class="btn" type="button" data-act="' + n.act + '"' + (n.task ? ' data-task="' + esc(n.task) + '"' : "") + ">" + n.btn + "</button>";
  return '<section class="plate next' + (n.tone === "sage" ? " plate-done" : "") + '" aria-labelledby="nextT">' + ORNAMENT + '<p class="eyebrow">' + esc(n.eyebrow) + '</p><h2 id="nextT">' + esc(n.title) + '</h2><p class="sub">' + esc(n.sub) + "</p>" + btn + "</section>";
}

function cardsRow(deck){
  const st = studyStatus(deck);
  const done = !st.ready && deck.reviewedToday > 0;
  const title = st.ready ? "Flashcards: " + st.title : done ? "Flashcards em dia" : deck.total ? "Flashcards: nada vence agora" : "Flashcards: deck vazio";
  const meta = done ? plural(deck.reviewedToday, "resposta hoje", "respostas hoje") + ". " + st.why : st.why;
  return '<li class="task task-cards' + (done ? " done" : "") + '"><input type="checkbox" class="chk" tabindex="-1" aria-hidden="true"' + (done ? " checked" : "") + '><div class="task-body"><a class="task-title" href="#estudo">' + esc(title) + '</a><div class="task-meta"><span class="tag c-base">Flashcards</span><span>' + esc(meta) + "</span></div></div>" +
    '<a class="btn btn-small ' + (st.ready ? "" : "btn-ghost ") + 'task-start" href="#estudo">' + icon("play", 14) + "Estudar</a></li>";
}

function dailyWordsRow(){
  const dw = dailyWordsHint();
  if (!dw) return "";
  return '<li class="task task-cards"><input type="checkbox" class="chk" tabindex="-1" aria-hidden="true"><div class="task-body"><a class="task-title" href="#palavras">Palavras do dia (' + dw.level + "): " + plural(dw.n, "pronta", "prontas") + ' para adicionar</a><div class="task-meta"><span class="tag c-base">Flashcards</span><span>As mais usadas do nível, sem repetir.</span></div></div>' +
    '<a class="btn btn-small btn-ghost task-start" href="#palavras">' + icon("plus", 14) + "Ver</a></li>";
}

function manualForm(){
  const chips = SKILL_ORDER.map(k => '<label class="chip c-' + SKILLS[k].c + '"><input type="radio" name="logSkill" value="' + k + '"' + (k === lastSkill ? " checked" : "") + ' data-change="pick-skill"><span>' + SKILLS[k].n + "</span></label>").join("");
  return '<details class="quiet manual" data-det="manual-log"' + (isOpen("manual-log") ? " open" : "") + '><summary>' + icon("plus", 16) + 'Registrar estudo à mão</summary><form data-submit="log-manual">' +
    '<div class="row"><div class="field"><label for="logDate">Data</label><input type="date" id="logDate" name="date" value="' + today() + '"></div><div class="field"><label for="logMin">Minutos</label><input type="number" id="logMin" name="min" min="1" max="600" inputmode="numeric" placeholder="30"></div></div>' +
    '<div class="quick">' + [15, 20, 30, 45, 60, 90].map(m => '<button class="btn btn-ghost btn-small" type="button" data-act="quick-min" data-min="' + m + '">' + m + " min</button>").join("") + "</div>" +
    '<div class="field mt-m"><span class="lbl">Habilidade</span><div class="chips" role="radiogroup">' + chips + "</div></div>" +
    '<div class="field"><label for="logNote">Nota (opcional)</label><input type="text" id="logNote" name="note" maxlength="140" placeholder="Ex.: episódio 4 do podcast"></div>' +
    '<div class="row"><button class="btn" type="submit">Registrar</button><button class="btn btn-ghost" type="button" data-act="free-timer">' + icon("play", 14) + "Cronômetro livre</button></div></form></details>";
}

export default {
  id: "hoje",
  title: "Hoje",
  render(){
    const t = today();
    const rw = currentRoadmapWeek(), p = PHASES[phaseOf(rw)];
    const dayMap = minutesByDate(S.logs), st = streak(dayMap, t);
    const minToday = dayMap.get(t) || 0;
    const goalDay = Math.round(S.state.settings.goalH * 60 / 6);
    const deck = deckToday();
    const plan = todayPlan(rw);
    const pace = paceText(rw);
    const doneN = plan.list.filter(x => S.state.done[x.k]).length;
    const planMin = plan.list.filter(x => !S.state.done[x.k]).reduce((a, x) => a + (x.m || 0), 0);
    const logsToday = S.logs.filter(e => e.date === t).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const ph = phraseOfDay();

    let lead;
    if (st.studiedToday) lead = minToday >= goalDay ? "Meta do dia batida. O que vier agora é bônus." : "Você já começou hoje. Faltam " + (goalDay - minToday) + " min para a meta do dia.";
    else if (st.days > 0) lead = "Sua sequência é de " + plural(st.days, "dia", "dias") + ". Bora manter?";
    else lead = "Um passo pequeno hoje já conta.";

    const greet = greeting();
    let h = '<header class="page-head hello"><div><p class="eyebrow">' + esc(longDate(t)) + '</p><h1 class="greet">' + greet + '<span class="dot">.</span></h1><p class="lead">' + esc(lead) + "</p></div>" +
      '<a class="spine pace-' + pace.tone + '" href="#rota" style="--pc:var(' + p.col + ')"><span class="spine-k">Semana</span><b class="num">' + rw + '</b><span class="spine-p">' + esc(p.name) + "</span></a></header>";
    h += '<div class="desk"><div class="desk-col desk-main">';
    h += heroHTML(nextStep(deck, plan.list));

    h += '<section class="card notebook" aria-labelledby="planT"><div class="card-head"><h2 id="planT">Plano de hoje</h2><span class="muted num t-sm">' + doneN + " de " + plan.list.length + (planMin ? " · ~" + planMin + " min" : "") + "</span></div>";
    h += '<ul class="tasks numbered">' + cardsRow(deck) + dailyWordsRow() + plan.list.map(x => taskHTML(x, {start: true, compact: true})).join("") + "</ul>";
    if (!plan.list.length) h += '<p class="muted mt-s">Nenhuma tarefa da rota para hoje. As da semana já estão feitas.</p>';
    h += '<div class="card-foot"><button class="more-link" type="button" data-act="plan-more">' + icon("plus", 15) + 'Puxar mais uma tarefa</button><a class="more-link" href="#rota">Ver a semana inteira' + icon("arrow", 15) + "</a></div></section>";
    h += "</div>";

    h += '<div class="desk-col desk-side">';
    h += '<section class="card daycard" aria-label="Seu dia"><div class="day-top">' + ring(minToday, goalDay) + '<div class="day-txt"><div class="streak' + (st.days ? "" : " cold") + '">' + icon("flame", 18) + '<span class="num">' + plural(st.days, "dia seguido", "dias seguidos") + '</span></div><p class="streak-sub">' + (!st.days ? (st.studiedToday ? "Começou hoje. Volte amanhã para somar." : "Estude hoje para começar uma sequência.") + " Você tem 1 folga por semana." : st.restThisWeek ? "Folga desta semana já usada." : "Você tem 1 folga por semana sem perder a sequência.") + "</p></div></div>" + weekRibbon(dayMap, t) + "</section>";
    if (ph){
      h += '<section class="card bookmark" aria-labelledby="phT"><p class="eyebrow" id="phT">Frase do dia</p><blockquote class="phrase">' + highlight(ph.ex.en, ph.card.term) + '</blockquote><details class="phrase-pt"><summary>Ver tradução</summary><p>' + esc(ph.ex.pt) + '</p></details><div class="phrase-foot">' + speakBtn(ph.ex.en, "Ouvir a frase") + '<span class="phrase-term"><b>' + esc(ph.card.term) + "</b>" + (ph.card.translation ? " · " + esc(ph.card.translation) : "") + "</span></div></section>";
    }
    h += '<section class="card diary" aria-labelledby="logT"><div class="card-head"><h2 id="logT">Diário de hoje</h2>' + (logsToday.length ? '<span class="muted num t-sm">' + plural(logsToday.length, "registro", "registros") + "</span>" : "") + "</div>" + (logsToday.length ? '<ul class="loglist">' + logsToday.map(logLi).join("") + "</ul>" : '<p class="muted diary-empty">Nada ainda. Use “Começar” numa tarefa e o tempo entra aqui sozinho.</p>') + '<div class="card-foot">' + manualForm() + "</div></section>";
    h += "</div></div>";
    return h;
  },
  actions: {
    "plan-more"(){
      const rw = currentRoadmapWeek();
      const tasks = weekTaskList(rw);
      const keys = (S.state.dayPlan && S.state.dayPlan.keys) || [];
      const next = nextOpen(tasks, S.state.done, keys);
      if (!next){ toast("Todas as tarefas da semana já estão no plano ou feitas. Que semana!"); return; }
      updateQuiet(s => { s.dayPlan = {date: today(), keys: keys.concat(next.k)}; });
      rerender();
    },
    "quick-min"(el){ const i = document.getElementById("logMin"); if (i){ i.value = el.dataset.min; i.focus(); } },
    "pick-skill"(el){ lastSkill = el.value; try { localStorage.setItem(LS_SKILL, el.value); } catch (e){} },
    "log-manual"(form){
      const f = new FormData(form);
      const min = Number(f.get("min"));
      if (!(min >= 1 && min <= 600)){ toast("Informe entre 1 e 600 minutos."); return; }
      const skill = f.get("logSkill") || lastSkill;
      const e = addLog({date: f.get("date") || today(), min, skill, note: String(f.get("note") || "").trim()});
      toast("Registrado: " + min + " min de " + skillOf(e.skill).n + ".");
    },
    "free-timer"(){
      if (timer.running()){ toast("Já tem um cronômetro rodando."); return; }
      const sel = document.querySelector('input[name="logSkill"]:checked');
      const skill = sel ? sel.value : lastSkill;
      timer.start({skill, label: SKILLS[skill].n});
    }
  }
};
