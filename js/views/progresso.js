// Progresso: what you've built so far. Heatmap, known words, achievements, hours, skills, lessons, history.
import { S } from "../core/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatHours, pct, plural } from "../core/format.js";
import { today, addDays, mondayOf, parse, MESES, shortDate } from "../core/date.js";
import { sk, CATN } from "../data/skills.js";
import { LES } from "../data/lessons.js";
import { allLogs, minutesBy, calWeekOf, planSplit, latestScore, lowLessons } from "../domain/route.js";
import { minutesByDate, streak, heatmap, heatLevel, knownCount, learnedCount, knownTimeline, weekSummary } from "../domain/stats.js";
import { ACHIEVEMENTS } from "../domain/achievements.js";
import { logLi } from "../ui/tasks.js";
import { rerender } from "../core/rerender.js";

const ui = {months: 3};

function statTiles(dayMap){
  const logs = S.logs, total = logs.reduce((a, e) => a + e.min, 0);
  const cw = Math.max(1, calWeekOf(today()));
  const last4 = []; for (let w = Math.max(1, cw - 3); w <= cw; w++) last4.push(w);
  const m4 = logs.filter(e => last4.indexOf(calWeekOf(e.date)) > -1).reduce((a, e) => a + e.min, 0);
  const inM = minutesBy(e => sk(e.skill).c === "in"), outM = minutesBy(e => sk(e.skill).c === "out");
  const bal = inM + outM ? Math.round(inM / (inM + outM) * 100) : 0;
  const st = streak(dayMap, today());
  let h = '<div class="stats">';
  h += '<div class="stat"><b>' + formatHours(total) + " h</b><span>estudadas no total</span></div>";
  h += '<div class="stat"><b>' + st.days + "</b><span>" + (st.days === 1 ? "dia seguido" : "dias seguidos") + " com estudo" + (st.restThisWeek ? " (folga da semana usada)" : "") + "</span></div>";
  h += '<div class="stat"><b>' + knownCount(S.cards) + "</b><span>palavras que você sabe · " + learnedCount(S.cards) + " em estudo</span></div>";
  h += '<div class="stat"><b>' + formatHours(m4 / last4.length) + " h</b><span>média semanal " + (last4.length === 1 ? "nesta semana" : "nas últimas " + last4.length + " semanas") + " (meta " + formatHours(S.state.settings.goalH * 60) + " h)</span></div>";
  h += '<div class="stat"><b>' + (inM + outM ? bal + "/" + (100 - bal) : "–") + "</b><span>entrada/produção em % (alvo 55–60/40–45)</span></div>";
  return h + "</div>";
}

function summaryCard(){
  const mon = mondayOf(parse(today()));
  const line = (label, s) => '<div><b>' + label + '</b><div class="summary-line">' +
    '<span class="pill">' + formatHours(s.min) + " h</span>" +
    '<span class="pill">' + plural(s.days, "dia", "dias") + " de estudo</span>" +
    '<span class="pill">' + plural(s.newWords, "palavra nova", "palavras novas") + "</span>" +
    '<span class="pill">' + plural(s.reviews, "revisão", "revisões") + "</span>" +
    '<span class="pill">' + plural(s.tasks, "tarefa", "tarefas") + "</span></div></div>";
  const ctx = {logs: S.logs, reviews: S.reviews, done: S.state.done};
  const prev = weekSummary(ctx, addDays(mon, -7)), cur = weekSummary(ctx, mon);
  let h = '<section class="card section"><h2>Resumo da semana</h2><div class="stack">' + line("Esta semana", cur);
  if (prev.min || prev.reviews) h += line("Semana passada", prev);
  const diff = cur.min - prev.min;
  if (prev.min && cur.min) h += '<p class="hint" style="margin:0">' + (diff >= 0 ? "Já " + formatHours(diff) + " h acima da semana passada. Bom ritmo!" : "Faltam " + formatHours(-diff) + " h para igualar a semana passada.") + "</p>";
  return h + "</div></section>";
}

function heatHTML(dayMap){
  const t = today(), weeks = 26;
  const grid = heatmap(dayMap, t, weeks);
  const days = Array.from(dayMap.values()).filter(v => v > 0).length;
  let h = '<section class="card section"><div class="section-head"><h2>Dias de estudo</h2><span class="muted">' + plural(days, "dia", "dias") + ' no total</span></div><div class="heat" role="img" aria-label="Mapa dos dias estudados nos últimos 6 meses">';
  grid.forEach(col => {
    h += '<div class="heat-col">' + col.map(c => '<i class="' + (c.future ? "fut" : "l" + heatLevel(c.min)) + (c.date === t ? " today" : "") + '" title="' + esc(shortDate(c.date)) + ": " + c.min + ' min"></i>').join("") + "</div>";
  });
  h += '</div><div class="heat-legend">menos ' + [0, 1, 2, 3, 4].map(l => '<i style="background:var(--heat-' + l + ')"></i>').join("") + " mais</div></section>";
  return h;
}

function knownChart(){
  const pts = knownTimeline(S.reviews, S.cards, 26, today());
  const W = 600, H = 170, padL = 34, padB = 22, top = 12;
  const maxV = Math.max(20, ...pts.map(p => p.n));
  const x = i => padL + i * (W - padL - 10) / (pts.length - 1), y = v => top + (H - padB - top) * (1 - v / maxV);
  const line = pts.map((p, i) => x(i) + "," + y(p.n)).join(" ");
  let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Palavras que você sabe ao longo das semanas">';
  [0, 0.5, 1].forEach(f => { const v = Math.round(maxV * f); s += '<line x1="' + padL + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--rule)"/><text x="' + (padL - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>"; });
  s += '<polygon points="' + x(0) + "," + y(0) + " " + line + " " + x(pts.length - 1) + "," + y(0) + '" fill="var(--sage-soft)"/>';
  s += '<polyline points="' + line + '" fill="none" stroke="var(--sage)" stroke-width="2.5" stroke-linejoin="round"/>';
  pts.forEach((p, i) => { if (i % 6 === 0 || i === pts.length - 1) s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(shortDate(p.week)) + "</text>"; });
  return s + "</svg>";
}

function badgesHTML(){
  const got = S.state.achievements;
  const n = ACHIEVEMENTS.filter(a => got[a.id]).length;
  const list = ACHIEVEMENTS.slice().sort((a, b) => (got[b.id] ? 1 : 0) - (got[a.id] ? 1 : 0));
  let h = '<section class="section"><div class="section-head"><h2>Conquistas</h2><span class="muted">' + n + " de " + ACHIEVEMENTS.length + '</span></div><div class="badges">';
  list.forEach(a => {
    h += '<div class="badge' + (got[a.id] ? "" : " locked") + '"><span class="medal">' + icon(a.icon, 20) + "</span><b>" + esc(a.t) + "</b><small>" + esc(a.d) + (got[a.id] ? "<br>" + esc(shortDate(got[a.id])) : "") + "</small></div>";
  });
  return h + "</div></section>";
}

function weeklyChart(cw){
  const data = new Map();
  let maxW = cw;
  S.logs.forEach(e => { const w = calWeekOf(e.date); if (w < 1) return; maxW = Math.max(maxW, w); const o = data.get(w) || {base: 0, in: 0, out: 0}; o[sk(e.skill).c] += e.min; data.set(w, o); });
  const n = Math.max(maxW, 12), bw = 16, gap = 8, padL = 34, padB = 22, H = 190, top = 10;
  const goal = S.state.settings.goalH * 60;
  let maxV = goal * 1.25; data.forEach(o => { maxV = Math.max(maxV, o.base + o.in + o.out); });
  const Wd = padL + n * (bw + gap) + 8, ch = H - padB - top, y = v => top + ch - v / maxV * ch;
  let s = '<svg class="chart" width="' + Wd + '" height="' + H + '" viewBox="0 0 ' + Wd + " " + H + '" role="img" aria-label="Horas estudadas por semana">';
  const step = maxV > 1800 ? 600 : maxV > 900 ? 300 : 180;
  for (let v = 0; v <= maxV; v += step) s += '<line x1="' + padL + '" x2="' + Wd + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--rule)" stroke-width="1"/><text x="' + (padL - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (v / 60) + "h</text>";
  for (let w = 1; w <= n; w++){
    const o = data.get(w) || {base: 0, in: 0, out: 0}, x = padL + (w - 1) * (bw + gap) + gap / 2;
    let acc = 0;
    ["base", "in", "out"].forEach(c => { if (!o[c]) return; const y1 = y(acc + o[c]), y0 = y(acc); s += '<rect x="' + x + '" y="' + y1 + '" width="' + bw + '" height="' + Math.max(0, y0 - y1) + '" rx="3" fill="var(--c-' + c + ')"><title>Semana ' + w + ": " + formatHours(o[c]) + " h de " + CATN[c] + "</title></rect>"; acc += o[c]; });
    if (w === 1 || w % 4 === 0 || w === cw) s += '<text x="' + (x + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle"' + (w === cw ? ' style="fill:var(--ink);font-weight:700"' : "") + ">" + w + "</text>";
  }
  s += '<line x1="' + padL + '" x2="' + Wd + '" y1="' + y(goal) + '" y2="' + y(goal) + '" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 4"/>';
  return s + "</svg>";
}

function skillsHTML(){
  const PLAN = planSplit(true);
  const sumPlan = PLAN.reduce((a, s) => a + s[2], 0);
  const actual = {}; PLAN.forEach(s => { actual[s[0]] = 0; });
  S.logs.forEach(e => { const k = e.skill === "vocab" ? "cards" : e.skill; if (k in actual) actual[k] += e.min; });
  const sumAct = Object.keys(actual).reduce((a, k) => a + actual[k], 0);
  let top = 30; PLAN.forEach(s => { top = Math.max(top, s[2] / sumPlan * 100, sumAct ? actual[s[0]] / sumAct * 100 : 0); });
  let h = '<section class="card section"><h2>Habilidades</h2><p class="muted">A barra é a sua parte do tempo; o traço é a parte planejada.</p><div class="hbars">';
  PLAN.forEach(s => {
    const a = sumAct ? actual[s[0]] / sumAct * 100 : 0, pl = s[2] / sumPlan * 100;
    h += '<div class="hbar c-' + sk(s[0]).c + '"><span>' + s[1] + '</span><span class="hbar-track"><i style="width:' + (a / top * 100) + '%"></i><em style="left:' + (pl / top * 100) + '%"></em></span><span class="v">' + formatHours(actual[s[0]]) + " h, " + Math.round(a) + "%</span></div>";
  });
  h += "</div></section>";
  h += '<section class="card section"><h2>Lições do British Council</h2><p class="muted">Gramática, listening, reading, writing e speaking marcadas como feitas.</p><div class="hbars">';
  ["A2", "B1", "B2"].forEach(l => {
    const ids = Object.keys(LES).filter(k => LES[k].lvl === l), d = ids.filter(k => S.state.done[k]).length;
    h += '<div class="hbar"><span>Nível ' + l + '</span><span class="hbar-track"><i style="width:' + pct(d, ids.length) + '%"></i></span><span class="v">' + d + " de " + ids.length + "</span></div>";
  });
  return '<div class="grid-2 even">' + h + "</section></div>";
}

function scoresHTML(){
  const scored = Object.keys(LES).filter(id => latestScore(id));
  let h = '<section class="card section"><h2>Notas das lições</h2>';
  if (!scored.length) return h + '<p class="muted">Nenhuma nota ainda. Anote a porcentagem na tarefa da lição ou do reteste, e as revisões de bloco passam a mostrar o que refazer.</p></section>';
  const r = lowLessons(scored), avg = Math.round(scored.reduce((a, id) => a + latestScore(id).p, 0) / scored.length);
  h += '<p class="muted">' + scored.length + (scored.length === 1 ? " lição com nota" : " lições com nota") + ", média " + avg + "% na última tentativa de cada uma. " + (r.low.length ? (r.low.length === 1 ? "Esta está abaixo de 80%:" : "Estas " + r.low.length + " estão abaixo de 80%:") : "Nenhuma abaixo de 80%.") + "</p>";
  if (r.low.length) h += '<ul class="split">' + r.low.map(x => '<li><a href="' + esc(LES[x[0]].u) + '" target="_blank" rel="noopener">' + esc(x[0] + " " + LES[x[0]].t) + "</a><span>" + x[1] + "%</span></li>").join("") + "</ul>";
  return h + "</section>";
}

function historyHTML(){
  const by = new Map();
  allLogs().forEach(e => { const m = e.date.slice(0, 7); if (!by.has(m)) by.set(m, []); by.get(m).push(e); });
  const months = Array.from(by.keys()).sort().reverse();
  let h = '<section class="section"><h2>Histórico</h2>';
  if (!months.length) return h + '<p class="muted">Sem registros ainda.</p></section>';
  months.slice(0, ui.months).forEach(m => {
    const list = by.get(m), mt = list.reduce((a, e) => a + e.min, 0), dt = parse(m + "-01");
    h += '<div class="month"><h3>' + MESES[dt.getMonth()] + " de " + dt.getFullYear() + ', <span class="muted">' + formatHours(mt) + ' h</span></h3><ul class="loglist">' + list.map(logLi).join("") + "</ul></div>";
  });
  if (months.length > ui.months) h += '<p><button class="btn btn-ghost btn-small" type="button" data-act="more-months">Ver meses anteriores</button></p>';
  return h + "</section>";
}

export default {
  id: "progresso",
  title: "Progresso",
  render(){
    const dayMap = minutesByDate(S.logs);
    const cw = Math.max(1, calWeekOf(today()));
    let h = '<div class="page-head"><p class="eyebrow">Sua jornada</p><h1>Progresso</h1><p class="lead">Tudo o que você já construiu. Cada quadradinho verde é um dia em que você apareceu.</p></div>';
    h += statTiles(dayMap);
    h += '<div class="grid-2 even">' + summaryCard() + heatHTML(dayMap) + "</div>";
    h += '<section class="card section"><div class="section-head"><h2>Palavras que você sabe</h2><span class="muted">revisão a cada 21 dias ou mais</span></div>';
    h += S.reviews.length ? knownChart() : '<p class="muted">Quando você começar a estudar os flashcards, a curva das palavras que ficaram de vez aparece aqui. <a href="#palavras">Adicionar palavras</a></p>';
    h += "</section>";
    h += badgesHTML();
    h += '<section class="card section"><h2>Horas por semana</h2>';
    h += S.logs.length ? '<div class="scroll">' + weeklyChart(cw) + '</div><ul class="legend">' + ["base", "in", "out"].map(c => '<li class="c-' + c + '">' + CATN[c] + "</li>").join("") + '<li style="--lc:transparent">Linha tracejada: meta semanal</li></ul>' : '<p class="muted">Nenhum registro ainda. Comece uma tarefa em Hoje e o gráfico aparece aqui.</p>';
    h += "</section>";
    h += skillsHTML();
    h += scoresHTML();
    h += historyHTML();
    return h;
  },
  actions: {
    "more-months"(){ ui.months += 6; rerender(); }
  }
};
