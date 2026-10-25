// Rota: the journey map, this week's tasks and hours, and the full 52-week route.
import { S, update } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatHours } from "../core/format.js";
import { today, addDays, parse, shortDate, DIAS } from "../core/date.js";
import { rerender } from "../core/rerender.js";
import { CATN, sk } from "../data/skills.js";
import { PH, phaseOf, weekTasks, extraTasks, extraPlan, weekStats, weekComplete, weekTimeUpDate, weekLabel, currentRoadmapWeek, calWeekOf, calWeekStart, paceText, goalLabel } from "../domain/route.js";
import { taskHTML, focusHTML } from "../ui/tasks.js";
import { openCore } from "../domain/week-close.js";

let viewWeek = null;
const openWeeks = new Set();
let opened = false;

/* ---------- journey map ---------- */
const TOTAL = 60;
const X = u => 40 + u / TOTAL * 920;
const Y = u => 92 + 26 * Math.sin(u / TOTAL * Math.PI * 3 - 0.6);
function pathBetween(a, b){
  const pts = [];
  for (let u = a; u <= b + 0.001; u += 0.5) pts.push(X(u).toFixed(1) + "," + Y(u).toFixed(1));
  return "M" + pts.join(" L");
}
function journey(rw){
  const st = weekStats(rw);
  const frac = rw >= 53 ? 0 : (st.total ? st.done / st.total : 0);
  const pos = Math.min(TOTAL, rw >= 53 ? 52 + (rw - 53) * 0.5 + 0.5 : (rw - 1) + frac);
  const segs = [[0, 1, "--p0"], [1, 12, "--p1"], [12, 26, "--p2"], [26, 44, "--p3"], [44, 52, "--p4"], [52, 60, "--p5"]];
  let s = '<svg viewBox="0 0 1000 190" role="img" aria-label="Rota do A2 ao C1. Você está na semana ' + rw + '.">';
  segs.forEach(g => { s += '<path d="' + pathBetween(g[0], g[1]) + '" fill="none" stroke="var(' + g[2] + ')" stroke-width="10" stroke-linecap="round" opacity=".28"' + (g[0] >= 52 ? ' stroke-dasharray="2 16"' : "") + "/>"; });
  segs.forEach(g => { if (pos > g[0]) s += '<path d="' + pathBetween(g[0], Math.min(g[1], pos)) + '" fill="none" stroke="var(' + g[2] + ')" stroke-width="10" stroke-linecap="round"/>'; });
  const stations = [[0, "A2", "início"], [12, "", "A2+"], [26, "B1", "semana 26"], [44, "B2", "semana 44"], [52, "", "B2 comprovado"], [60, "C1", "depois"]];
  stations.forEach(([u, big, sub]) => {
    const passed = pos >= u && u > 0;
    const r = big ? 11 : 7;
    s += '<circle cx="' + X(u) + '" cy="' + Y(u) + '" r="' + r + '" fill="' + (passed ? "var(--ink)" : "var(--surface)") + '" stroke="var(--ink)" stroke-width="3.5"/>';
    const anchor = u === 0 ? "start" : u === TOTAL ? "end" : "middle";
    const lx = u === 0 ? X(u) - 10 : u === TOTAL ? X(u) + 10 : X(u);
    if (big) s += '<text x="' + lx + '" y="' + (Y(u) + 46) + '" text-anchor="' + anchor + '" font-size="34" font-weight="600">' + big + '</text><text class="sub" x="' + lx + '" y="' + (Y(u) + 64) + '" text-anchor="' + anchor + '">' + sub + "</text>";
    else s += '<text class="sub" x="' + X(u) + '" y="' + (Y(u) + 28) + '" text-anchor="middle">' + sub + "</text>";
  });
  const yx = X(pos), yy = Y(pos);
  s += '<g><line x1="' + yx + '" x2="' + yx + '" y1="' + (yy - 46) + '" y2="' + (yy - 12) + '" stroke="var(--accent)" stroke-width="2.5"/><circle cx="' + yx + '" cy="' + yy + '" r="12" fill="var(--accent)" stroke="var(--surface)" stroke-width="4"/>';
  const lw = 132, lx = Math.max(4, Math.min(1000 - lw - 4, yx - lw / 2));
  s += '<rect x="' + lx + '" y="' + (yy - 76) + '" width="' + lw + '" height="30" rx="15" fill="var(--accent)"/><text x="' + (lx + lw / 2) + '" y="' + (yy - 56) + '" text-anchor="middle" font-size="16" font-weight="600" style="fill:var(--accent-ink)">Você · sem. ' + rw + "</text></g>";
  return s + "</svg>";
}

const LEVEL_HOURS = [["B1", 200], ["B2", 450], ["C1", 650]];
function hoursMeter(){
  const h = S.logs.reduce((a, e) => a + e.min, 0) / 60;
  const next = LEVEL_HOURS.find(l => l[1] > h) || LEVEL_HOURS[LEVEL_HOURS.length - 1];
  const cap = 700;
  let s = '<p style="margin:14px 0 0"><b>Rumo ao ' + next[0] + ":</b> " + formatHours(h * 60) + " de cerca de " + next[1] + ' h de estudo ativo <span class="muted">(estimativa)</span></p>';
  s += '<div class="meter" role="img" aria-label="' + formatHours(h * 60) + ' horas estudadas"><i style="width:' + Math.min(100, h / cap * 100) + '%"></i>';
  LEVEL_HOURS.forEach((l, i) => { s += '<span class="mark' + (i % 2 ? " lo" : "") + '" style="left:' + (l[1] / cap * 100) + '%"><span>' + l[0] + " · " + l[1] + " h</span></span>"; });
  return s + "</div>";
}

/* ---------- this week ---------- */
function weekHours(){
  const t = today(), cw = calWeekOf(t);
  const start = calWeekStart(cw);
  const days = []; for (let i = 0; i < 7; i++) days.push(addDays(start, i));
  const inWeek = S.logs.filter(e => e.date >= days[0] && e.date <= days[6]);
  const by = {base: 0, in: 0, out: 0}; let tot = 0;
  inWeek.forEach(e => { by[sk(e.skill).c] += e.min; tot += e.min; });
  const goal = S.state.settings.goalH * 60, scale = Math.max(goal, tot);
  const perDay = days.map(d => inWeek.filter(e => e.date === d).reduce((a, e) => a + e.min, 0));
  const cardsDay = days.map(d => inWeek.some(e => e.date === d && (e.skill === "cards" || e.skill === "vocab")) || S.reviews.some(r => r.date === d));
  const maxDay = Math.max(90, ...perDay);
  let h = '<p class="big"><strong class="num">' + formatHours(tot) + " h</strong> de " + goalLabel() + (cw > 0 ? '<span class="muted" style="font-size:14px;display:block;margin-top:6px">' + shortDate(days[0]) + " a " + shortDate(days[6]) + (tot >= goal ? ", meta da semana batida" : ", faltam " + formatHours(goal - tot) + " h") + "</span>" : "") + "</p>";
  h += '<div class="barstack" role="img" aria-label="Horas por categoria">' + ["base", "in", "out"].map(c => '<span class="c-' + c + '" style="width:' + (by[c] / scale * 100) + '%;background:var(--lc)"></span>').join("") + "</div>";
  h += '<ul class="legend">' + ["base", "in", "out"].map(c => '<li class="c-' + c + '">' + (c === "base" ? "Base" : CATN[c]) + " " + formatHours(by[c]) + " h</li>").join("") + "</ul>";
  h += '<div class="days">' + days.map((d, i) => { const dt = parse(d); return '<div class="day' + (d === t ? " today" : "") + '" title="' + perDay[i] + ' min"><div class="day-bar"><span style="height:' + (perDay[i] / maxDay * 100) + '%"></span></div><span>' + DIAS[dt.getDay()] + '</span><span class="num">' + (perDay[i] ? perDay[i] + "′" : "–") + '</span><span class="dot' + (cardsDay[i] ? " on" : "") + '" title="' + (cardsDay[i] ? "Flashcards feitos" : "Sem flashcards") + '"></span></div>'; }).join("") + "</div>";
  h += '<p class="hint">O pontinho acende nos dias com flashcards.</p>';
  return h;
}

function extrasHTML(n){
  const xs = extraTasks(n);
  if (!xs.length){
    if (extraPlan().extra > 0) return "";
    return '<p class="hint">Sua meta está em ' + goalLabel() + ' por semana. Acima de 13,5 h, entram aqui extras de leitura com áudio e conversa. Ajuste em <a href="#ajustes">Ajustes</a>.</p>';
  }
  const done = xs.filter(t => S.state.done[t.k]).length;
  return '<h3 style="margin:22px 0 2px;font-size:16px">Extras da meta de ' + goalLabel() + ", " + done + " de " + xs.length + '</h3><p class="hint" style="margin:0 0 4px">As horas acima das 13,5 h da rota base.</p><ul class="tasks">' + xs.map(t => taskHTML(t, {start: true})).join("") + "</ul>";
}

// what still holds the current week open
function closeHint(vw, rw){
  if (vw !== rw || rw >= 400 || weekComplete(rw)) return "";
  const core = openCore(weekTasks(rw), S.state.done);
  if (core.length) return '<p class="hint">Para fechar a semana: ' + esc(core.map(t => t.t).join("; ")) + ".</p>";
  return '<p class="hint">Núcleo feito. A semana avança em ' + esc(shortDate(weekTimeUpDate(rw))) + ", ou antes se você terminar tudo.</p>";
}

function weekCard(rw){
  const vw = viewWeek || rw;
  const ws = weekStats(vw);
  let h = '<section class="card" aria-labelledby="wkT"><div class="section-head"><h2 id="wkT">' + (vw >= 53 ? "Semana " + vw + " (C1)" : "Semana " + vw) + '</h2><span class="muted num">' + ws.done + " de " + ws.total + '</span><span class="week-nav"><button class="btn-icon btn" type="button" data-act="week-nav" data-d="-1" aria-label="Semana anterior"' + (vw <= 1 ? " disabled" : "") + ">" + icon("back", 18) + '</button><button class="btn-icon btn" type="button" data-act="week-nav" data-d="1" aria-label="Próxima semana">' + icon("arrow", 18) + "</button></span></div>";
  h += focusHTML(vw) + closeHint(vw, rw) + '<ul class="tasks">' + weekTasks(vw).map(t => taskHTML(t, {start: true})).join("") + "</ul>" + extrasHTML(vw);
  if (vw !== rw) h += '<p style="margin:14px 0 0"><button class="btn btn-ghost btn-small" type="button" data-act="week-go" data-n="' + rw + '">Voltar para a semana ' + rw + "</button></p>";
  return h + "</section>";
}

/* ---------- full route ---------- */
function roadmap(rw){
  let h = "";
  PH.forEach(p => {
    const to = p.to || Math.max(60, rw + 4);
    h += '<section class="phase" style="--pc:var(' + p.col + ')"><div class="phase-head"><h2>Fase ' + p.id + ": " + esc(p.name) + '</h2><p class="muted" style="margin:0">' + (p.to ? (p.from === p.to ? "Semana " + p.from : "Semanas " + p.from + " a " + p.to) + (p.id > 0 ? ", alvo " + p.cefr : ", para descobrir o seu ponto de partida") : "Semanas " + p.from + " em diante, um modelo semanal que se repete") + '</p><dl class="phase-facts"><div><dt>Flashcards</dt><dd>' + esc(p.cards) + "</dd></div><div><dt>ChatGPT</dt><dd>" + esc(p.gpt) + "</dd></div><div><dt>Checkpoint</dt><dd>" + esc(p.check) + '</dd></div></dl></div><ol class="weeks">';
    for (let n = p.from; n <= to; n++){
      const st = weekStats(n), open = openWeeks.has(n);
      const cls = ["wk"]; if (n === rw) cls.push("current"); if (S.state.skip[n]) cls.push("skipped"); else if (weekComplete(n)) cls.push("complete");
      h += '<li class="' + cls.join(" ") + '" id="wk-' + n + '"><button class="wk-row" type="button" data-act="week-toggle" data-n="' + n + '" data-fk="wk-' + n + '" aria-expanded="' + open + '"><span class="wk-n">Semana ' + n + '</span><span class="wk-sum">' + esc(weekLabel(n)) + '</span><span class="wk-prog">' + (S.state.skip[n] ? "pulada" : st.done + "/" + st.total) + "</span></button>";
      h += '<div class="wk-body"' + (open ? "" : " hidden") + ">";
      if (open) h += focusHTML(n) + '<ul class="tasks">' + weekTasks(n).map(t => taskHTML(t)).join("") + "</ul>" + extrasHTML(n) + '<div class="wk-actions"><button class="btn btn-ghost btn-small" type="button" data-act="week-skip" data-n="' + n + '">' + (S.state.skip[n] ? "Desfazer pular" : "Pular semana") + '</button><button class="btn btn-ghost btn-small" type="button" data-act="week-go" data-n="' + n + '">Mostrar no topo</button></div>';
      h += "</div></li>";
    }
    h += "</ol></section>";
  });
  return h;
}

export default {
  id: "rota",
  title: "Rota",
  render(){
    const rw = currentRoadmapWeek(), p = PH[phaseOf(rw)];
    if (!opened){ openWeeks.add(rw); opened = true; }
    const pace = paceText(rw);
    let h = '<div class="page-head"><p class="eyebrow">Fase ' + p.id + ": " + esc(p.name) + (p.id > 0 && p.id < 5 ? " · alvo " + p.cefr : "") + "</p><h1>" + (rw >= 53 ? "Semana " + rw + ": rumo ao C1" : "Semana " + rw + " de 52") + '</h1><p class="lead" style="margin-top:10px"><span class="pace pace-' + pace.tone + '">' + esc(pace.text) + "</span></p></div>";
    h += '<section class="card section"><div class="journey">' + journey(rw) + "</div>" + hoursMeter() + "</section>";
    h += '<div class="grid-2 section">' + weekCard(rw) + '<section class="card" aria-labelledby="hrsT"><h2 id="hrsT">Esta semana</h2>' + weekHours() + "</section></div>";
    h += '<section class="section"><div class="section-head"><h2>Rota completa</h2></div><p class="muted">52 semanas do A2 ao B2 com as lições gratuitas do British Council, seus flashcards e o ChatGPT, e depois um modelo semanal rumo ao C1. Uma semana avança quando você faz tudo dela, ou quando o tempo dela acaba e as lições, a conversa, as revisões e os checkpoints estão feitos. Se uma semana estiver fácil demais, pule.</p>' + roadmap(rw) + "</section>";
    return h;
  },
  actions: {
    "week-nav"(el){ const rw = currentRoadmapWeek(); viewWeek = Math.max(1, (viewWeek || rw) + Number(el.dataset.d)); if (viewWeek === rw) viewWeek = null; rerender(); },
    "week-go"(el){ const n = Number(el.dataset.n); viewWeek = n === currentRoadmapWeek() ? null : n; rerender(); window.scrollTo({top: 0, behavior: "smooth"}); },
    "week-toggle"(el){ const n = Number(el.dataset.n); if (openWeeks.has(n)) openWeeks.delete(n); else openWeeks.add(n); rerender(); },
    "week-skip"(el){ const n = Number(el.dataset.n); update(s => { if (s.skip[n]) delete s.skip[n]; else s.skip[n] = true; }); }
  }
};
