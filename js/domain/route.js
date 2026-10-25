// Route logic: which tasks each week has, where you are, pace and the extras above the base route.
import { S } from "../state/store.js";
import { cached } from "../state/memo.js";
import { today, daysBetween, addDays } from "../core/date.js";
import { formatHours } from "../core/format.js";
import { LES, LK, EERL, IDX } from "../data/lessons.js";
import { PH, phaseOf } from "../data/phases.js";
import { T, lessonTask, PX, WD, NOTE, msT, wiT, efT, cdT } from "../data/plan.js";
import { sk, SPLIT } from "../data/skills.js";
import { weekClosed } from "./week-close.js";

export { PH, phaseOf };


/* Weeks before revFrom keep the task list they had when the review upgrade arrived,
   so weeks already counted as done never lose that status. */
const revFrom = () => S.state.revFrom == null ? 9999 : S.state.revFrom;
const gramOf = m => (WD[m] ? WD[m].items : []).filter(i => typeof i === "string" && LES[i].s === "gram");
const listOf = m => (WD[m] ? WD[m].items : []).filter(i => typeof i === "string" && LES[i].s === "list");
function prevWeeks(n){ const out = []; for (let m = n - 1; m >= 1 && out.length < 4; m--){ if (!S.state.skip[m]) out.push(m); } return out; }

export function weekTasks(n){ return cached("w" + n, () => buildWeek(n)); }
function buildWeek(n){
  let tasks = [];
  if (n >= 53){
    const k = "c" + n;
    tasks = [
      T(k+"-g","gram","C1 grammar: 2 tópicos",90,LK.c1g),
      T(k+"-l","list","Listening C1: 1 lição e Audio zone ou Video zone",80,LK.c1l),
      T(k+"-r","read","Reading C1: 1 lição e B2–C1 stories",80,LK.c1r),
      T(k+"-w","writ","Writing C1: 1 texto argumentativo, corrigido",80,LK.c1w,NOTE.writ),
      T(k+"-me","speak","Mediação: resumir um artigo em voz alta para o ChatGPT",30,"#rotinas"),
      T(k+"-cv","conv","ChatGPT: debates de 45 min sobre temas abstratos",180,"#rotinas","Use o prompt 2 com nível C1."),
      T(k+"-in","input","Input livre: série, podcast ou YouTube sem legenda em português",70,null,"",{vol:true})
    ];
    if ((n - 52) % 12 === 0) tasks.push(T(k+"-ef","test","EF SET 50 min, meta 61 a 70 (C1)",60,LK.efset,"",{ms:true}));
    return tasks;
  }
  const d = WD[n], p = phaseOf(n), px = PX[p];
  const nv = n >= revFrom();
  const light = !!(d.light || (d.soft && nv));
  const noExtras = !!(d.noExtras || (d.soft && nv));
  d.items.forEach(it => { if (typeof it === "string") tasks.push(lessonTask(it)); else if (nv || !it.nv) tasks.push(it); });
  if (d.conv) tasks.push(T("w"+n+"-conv","conv","ChatGPT: "+d.conv, px ? px.conv : 90, "#rotinas", "Prompt 2 ou 3, no modo voz. Feedback só no fim."));
  if (!d.noStd){
    if (!nv){
      const prev = WD[n-1];
      if (prev && n > 2){
        const g = gramOf(n-1);
        if (g.length) tasks.push(T("w"+n+"-rt","gram","Refazer o “Grammar test 2” da semana passada: "+g.map(i => LES[i].t).join("; "),20,g.length===1?LES[g[0]].u:null,"Revisão espaçada de 7 dias.",{sc:g}));
      }
    } else {
      // skipped weeks don't count: a skipped week has nothing to review
      const pw = prevWeeks(n), w7 = pw[0], w28 = pw[3];
      const g7 = w7 >= 2 ? gramOf(w7) : [];
      if (g7.length) tasks.push(T("w"+n+"-rt","gram","Refazer o “Grammar test 2” da semana passada: "+g7.map(i => LES[i].t).join("; "),20,g7.length===1?LES[g7[0]].u:null,"Revisão espaçada de 7 dias. Anote a nota.",{sc:g7}));
      const g28 = (!d.block && w28 >= 2) ? gramOf(w28) : [];
      if (g28.length) tasks.push(T("w"+n+"-rt4","gram","Reteste de 4 semanas com questões novas: "+g28.map(i => LES[i].t).join("; "),g28.length===1?15:20,"#rotinas","Não refaça o teste do site, que você já viu: use o prompt 8 e anote a nota.",{sc:g28}));
      const l7 = w7 >= 2 ? listOf(w7) : [];
      if (l7.length) tasks.push(T("w"+n+"-rl","list","Reouvir sem transcrição: "+LES[l7[0]].t,10,LES[l7[0]].u,"Ouça uma vez sem ler e depois confira na transcrição o que escapou."));
      if (!d.err) tasks.push(T("w"+n+"-er","gram","Drill dos seus erros recorrentes (prompt 7)",10,"#rotinas","Em Rotinas, use “Copiar com os meus erros”."));
    }
    if (px && !noExtras){
      px.extras.forEach(e => tasks.push(T("w"+n+"-"+e[0], e[1], e[2], e[3], e[4], "", {vol:true})));
      if (px.vocab) tasks.push(T("w"+n+"-vo","vocab",px.vocab[0],px.vocab[1],IDX[px.vocab[2]][1],"",{vol:true}));
    }
    if (nv){
      // keep at least 4 h of input (listening + reading) per week, except in light weeks
      const otherIn = tasks.filter(t => sk(t.s).c === "in").reduce((a, t) => a + t.m, 0);
      const inMin = light ? 70 : Math.max(70, Math.ceil((240 - otherIn) / 10) * 10);
      tasks.push(T("w"+n+"-in","input","Input livre: série, podcast ou YouTube com legenda em inglês",inMin,null,(inMin > 70 ? "Mais input nesta semana para manter 4 h de entrada. " : "")+"Vale fora da mesa: trajeto, academia, série à noite.",{vol:true}));
    } else {
      tasks.push(T("w"+n+"-in","input","Input livre: série ou YouTube com legenda em inglês",70,null,"",{vol:true}));
    }
  }
  (d.ms || []).forEach(m => {
    if (m === "bc") tasks.push(msT(n));
    else if (m === "wi") tasks.push(wiT(n));
    else if (m.indexOf("ef:") === 0) tasks.push(efT(n, m.slice(3)));
    else if (m.indexOf("cd:") === 0) tasks.push(cdT(n, m.slice(3)));
  });
  return tasks;
}

/* ---------- extras above the base route ----------
   The base route fits 13.5 h a week (810 min). Hours above that become extra tasks:
   two thirds reading with audio (English e-Reader, plus News in Levels in phases 0 to 2),
   logged half as Reading and half as Listening, and one third extra conversation. Like the route's volume tasks,
   extras must be done to close a week early, but stay behind once the week's time is up. */
export const BASE_MIN = 810;
const r10 = v => Math.round(v / 10) * 10;
export function extraPlan(){
  const extra = Math.max(0, r10(S.state.settings.goalH * 60 - BASE_MIN));
  let ext = r10(extra * 2 / 3), conv = extra - ext;
  if (conv < 30){ ext += conv; conv = 0; }
  return {extra, ext, conv};
}
const EER = [[1,"A2 elementary","elementary"],[13,"B1 pre-intermediate","pre-intermediate"],[27,"B1+ intermediate","intermediate"],[36,"B2 intermediate-plus","intermediate-plus"],[53,"B2+ upper-intermediate","upper-intermediate"]];
function eerFor(n){ let r = EER[0]; EER.forEach(e => { if (n >= e[0]) r = e; }); return r; }
export function extraTasks(n){ return cached("x" + n, () => buildExtras(n)); }
function buildExtras(n){
  const out = [], x = extraPlan();
  if (x.extra > 0){
    const d = WD[n] || {}, light = n <= 52 && !!(d.light || d.soft);
    const ext = light ? r10(x.ext / 2) : x.ext;
    const conv = (light || n === 1) ? 0 : x.conv;
    let news = (!light && n <= 26) ? Math.min(90, r10(ext / 3)) : 0;
    if (news < 30) news = 0;
    const book = ext - news, lv = eerFor(n);
    const mix = m => { const r = r10(m / 2); return [["read", r], ["list", m - r]]; };
    if (book >= 20){
      let note = "Escolha livros com áudio. Leia cada capítulo ouvindo o áudio junto e depois ouça de novo sem o texto. Leia por prazer, sem parar no dicionário a cada linha: travou a cada parágrafo, desça um nível; fácil demais, suba. Leve no máximo 2 a 3 chunks por sessão para os flashcards.";
      if (n === 1) note = "Comece pelo quiz de nível do site (link no título). " + note;
      if (n >= 53) note = "Quando o upper-intermediate ficar fácil, passe para advanced e depois para os livros sem adaptação (unabridged). " + note;
      out.push(T("x"+n+"-eer","read","English e-Reader, "+lv[1]+": livro com áudio",book,n === 1 ? LK.eerQuiz : EERL+lv[2],note,{x:true, mix:mix(book)}));
    }
    if (news){
      const l = n <= 12 ? 2 : 3;
      out.push(T("x"+n+"-nil","read","News in Levels, nível "+l+": 2 notícias por dia",news,l === 2 ? LK.nil2 : LK.nil3,"Leia, depois ouça o áudio lendo junto e, por fim, só ouvindo. No dia seguinte, releia as de ontem e veja se lembra das palavras novas."+(l === 2 ? " Se estiver difícil, comece pelo nível 1." : ""),{x:true, mix:mix(news)}));
    }
    if (conv) out.push(T("x"+n+"-cv","conv","ChatGPT: conversa extra no modo voz",conv,"#rotinas","Prompt 2 ou 3, com um tema que apareceu nas leituras da semana.",{x:true}));
  }
  return out;
}
export function planSplit(merge){
  const g = S.state.settings.goalH * 60, x = extraPlan(), f = Math.min(1, g / BASE_MIN);
  const rows = SPLIT.map(s => [s[0], s[1], s[2] * f]);
  if (merge){
    const half = r10(x.ext / 2);
    rows.forEach(r => {
      if (r[0] === "read" && x.ext){ r[2] += half; r[1] = "Reading e livros"; }
      if (r[0] === "list" && x.ext){ r[2] += x.ext - half; r[1] = "Listening e áudio dos livros"; }
      if (r[0] === "conv") r[2] += x.conv;
    });
  } else {
    if (x.ext) rows.push(["read","Leitura com áudio (English e-Reader e News in Levels), metade reading e metade listening",x.ext]);
    if (x.conv) rows.push(["conv","Conversa extra no ChatGPT",x.conv]);
  }
  return rows;
}
export function weekLabel(n){
  if (n >= 53) return "Modelo semanal C1";
  const d = WD[n];
  if (d.label) return d.label;
  const g = d.items.filter(i => typeof i === "string" && LES[i].s === "gram").map(i => LES[i].t);
  return g.length ? g.join("; ") : weekTasks(n)[0].t;
}
export function weekMilestone(n){
  const ms = weekTasks(n).filter(t => t.ms).map(t => t.t);
  return ms.length ? ms.join("; ") : "";
}
export const weekNote = n => { const d = WD[n] || {}; return d.note && (!d.soft || n >= revFrom()) ? d.note : ""; };

/* ---------- position and pace ---------- */
export function calWeekOf(dateStr){ const d = daysBetween(S.state.settings.start, dateStr); return d < 0 ? 0 : Math.floor(d / 7) + 1; }
export function calWeekStart(cw){ return addDays(S.state.settings.start, (Math.max(cw, 1) - 1) * 7); }
export function weekStats(n){ return cached("s" + n, () => { const t = weekTasks(n); let d = 0; t.forEach(x => { if (S.state.done[x.k]) d++; }); return {done:d, total:t.length}; }); }
// done with everything, or out of time with the core done (see week-close.js)
export const weekTimeUp = n => expectedWeek(calWeekOf(today())) > n;
// first day the target pace expects you past week n
export function weekTimeUpDate(n){ for (let cw = Math.max(1, calWeekOf(today())); ; cw++) if (expectedWeek(cw) > n) return calWeekStart(cw); }
export function weekComplete(n){ return cached("c" + n + today(), () => weekClosed(weekTasks(n), extraTasks(n), S.state.done, weekTimeUp(n))); }
export function currentRoadmapWeek(){
  return cached("rw" + today(), () => {
    for (let n = 1; n < 400; n++){ if (S.state.skip[n] || weekComplete(n)) continue; return n; }
    return 400;
  });
}
export function expectedWeek(cw){ return Math.floor((Math.max(1, cw) - 1) * 52 / S.state.settings.targetWeeks) + 1; }
export function paceText(rw){
  const cw = calWeekOf(today()), tw = S.state.settings.targetWeeks;
  if (cw === 0) return {tone: "calm", text: "A rota começa em " + S.state.settings.start.split("-").reverse().slice(0, 2).join("/") + "."};
  if (rw >= 53) return {tone: "ahead", text: "Você terminou a rota do B2. Agora é a fase do C1."};
  const diff = rw - expectedWeek(cw);
  if (diff > 0) return {tone: "ahead", text: diff + (diff === 1 ? " semana" : " semanas") + " à frente da meta de " + tw + " semanas."};
  if (diff === 0) return {tone: "ok", text: "No ritmo da meta de " + tw + " semanas."};
  return {tone: "behind", text: (-diff) + ((-diff) === 1 ? " semana" : " semanas") + " atrás da meta de " + tw + " semanas. Priorize o volume de horas, não a ordem das tarefas."};
}

/* ---------- lesson scores ---------- */
// S.state.scores[lessonId] = [{k: task key, d: date, p: percent}], one entry per task
export function scoreFor(id, k){ const e = (S.state.scores[id] || []).find(x => x.k === k); return e ? e.p : null; }
export function latestScore(id, exceptK){ let best = null; (S.state.scores[id] || []).forEach(e => { if (exceptK && e.k === exceptK) return; if (!best || e.d >= best.d) best = e; }); return best; }
export function setScore(state, id, k, p){
  const arr = (state.scores[id] || []).filter(e => e.k !== k);
  if (p != null) arr.push({k, d: today(), p});
  if (arr.length) state.scores[id] = arr; else delete state.scores[id];
}
export function lowLessons(ids){
  const low = [], none = [];
  ids.forEach(id => { const e = latestScore(id); if (!e) none.push(id); else if (e.p < 80) low.push([id, e.p]); });
  low.sort((a, b) => a[1] - b[1]);
  return {low, none};
}

export const goalLabel = () => formatHours(S.state.settings.goalH * 60) + " h";
export const phaseNow = () => PH[phaseOf(currentRoadmapWeek())];
