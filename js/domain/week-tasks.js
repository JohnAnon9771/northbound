// Which tasks each route week has. buildWeek is pure; weekTasks reads the store and memoizes.
import { S } from "../state/store.js";
import { cached } from "../state/memo.js";
import { LESSONS, LINKS, LESSON_INDEXES } from "../data/lessons.js";
import { PHASES, phaseOf } from "../data/phases.js";
import { task, lessonTask, PHASE_EXTRAS, WEEKS, TASK_NOTES, levelTestTask, writeImproveTask, efsetTask, canDoTask, speakTestTask } from "../data/weeks.js";
import { isSpeakWeek } from "./speaking.js";
import { skillOf } from "../data/skills.js";

/* Weeks before revFrom keep the task list they had when the review upgrade arrived,
   so weeks already counted as done never lose that status. */
const revFromOf = route => route.revFrom == null ? 9999 : route.revFrom;
// same for the speaking test: it only joins weeks from spFrom on, so closed weeks don't reopen
const speakOn = (n, route) => n >= (route.spFrom == null ? 9999 : route.spFrom) && isSpeakWeek(n);
const gramOf = m => (WEEKS[m] ? WEEKS[m].items : []).filter(i => typeof i === "string" && LESSONS[i].s === "gram");
const listOf = m => (WEEKS[m] ? WEEKS[m].items : []).filter(i => typeof i === "string" && LESSONS[i].s === "list");
function prevWeeks(n, skip){ const out = []; for (let m = n - 1; m >= 1 && out.length < 4; m--){ if (!skip[m]) out.push(m); } return out; }

export const weekTasks = n => cached("w" + n, () => buildWeek(n, S.state));
// route: {revFrom, skip}, the matching fields of S.state
export function buildWeek(n, route){
  let tasks = [];
  if (n >= 53){
    const k = "c" + n;
    tasks = [
      task(k+"-g","gram","C1 grammar: 2 tópicos",90,LINKS.c1g),
      task(k+"-l","list","Listening C1: 1 lição e Audio zone ou Video zone",80,LINKS.c1l),
      task(k+"-r","read","Reading C1: 1 lição e B2–C1 stories",80,LINKS.c1r),
      task(k+"-w","writ","Writing C1: 1 texto argumentativo, corrigido",80,LINKS.c1w,TASK_NOTES.writ,{fb:{kind:"writ"}}),
      task(k+"-me","speak","Mediação: resumir um artigo em voz alta para o ChatGPT",30,"#rotinas"),
      task(k+"-cv","conv","ChatGPT: debates de 45 min sobre temas abstratos",180,"#rotinas","Use o prompt 2 com nível C1.",{fb:{kind:"conv",n:PHASES[5].convPerWeek}}),
      task(k+"-in","input","Input livre: série, podcast ou YouTube sem legenda em português",70,null,"",{vol:true})
    ];
    if ((n - 52) % 12 === 0) tasks.push(task(k+"-ef","test","EF SET 50 min, meta 61 a 70 (C1)",60,LINKS.efset,"",{ms:true}));
    if (speakOn(n, route)) tasks.push(speakTestTask(n));
    return tasks;
  }
  const d = WEEKS[n], p = phaseOf(n), px = PHASE_EXTRAS[p];
  const nv = n >= revFromOf(route);
  const light = !!(d.light || (d.soft && nv));
  const noExtras = !!(d.noExtras || (d.soft && nv));
  d.items.forEach(it => { if (typeof it === "string") tasks.push(lessonTask(it)); else if (nv || !it.nv) tasks.push(it); });
  if (d.conv) tasks.push(task("w"+n+"-conv","conv","ChatGPT: "+d.conv, px ? px.conv : 90, "#rotinas", "Prompt 2 ou 3, no modo voz. Feedback só no fim: cole no Diário.", {fb:{kind:"conv", n:PHASES[p].convPerWeek}}));
  if (!d.noStd){
    if (!nv){
      const prev = WEEKS[n-1];
      if (prev && n > 2){
        const g = gramOf(n-1);
        if (g.length) tasks.push(task("w"+n+"-rt","gram","Refazer o “Grammar test 2” da semana passada: "+g.map(i => LESSONS[i].t).join("; "),20,g.length===1?LESSONS[g[0]].u:null,"Revisão espaçada de 7 dias.",{sc:g}));
      }
    } else {
      // skipped weeks don't count: a skipped week has nothing to review
      const pw = prevWeeks(n, route.skip), w7 = pw[0], w28 = pw[3];
      const g7 = w7 >= 2 ? gramOf(w7) : [];
      if (g7.length) tasks.push(task("w"+n+"-rt","gram","Refazer o “Grammar test 2” da semana passada: "+g7.map(i => LESSONS[i].t).join("; "),20,g7.length===1?LESSONS[g7[0]].u:null,"Revisão espaçada de 7 dias. Anote a nota.",{sc:g7}));
      const g28 = (!d.block && w28 >= 2) ? gramOf(w28) : [];
      if (g28.length) tasks.push(task("w"+n+"-rt4","gram","Reteste de 4 semanas com questões novas: "+g28.map(i => LESSONS[i].t).join("; "),g28.length===1?15:20,"#rotinas","Não refaça o teste do site, que você já viu: use o prompt 8 e anote a nota.",{sc:g28}));
      const l7 = w7 >= 2 ? listOf(w7) : [];
      if (l7.length) tasks.push(task("w"+n+"-rl","list","Reouvir sem transcrição: "+LESSONS[l7[0]].t,10,LESSONS[l7[0]].u,"Ouça uma vez sem ler e depois confira na transcrição o que escapou."));
      if (!d.err) tasks.push(task("w"+n+"-er","gram","Drill dos seus erros recorrentes (prompt 7)",10,"#rotinas","Em Rotinas, use “Copiar com os meus erros”."));
    }
    if (px && !noExtras){
      px.extras.forEach(e => tasks.push(task("w"+n+"-"+e[0], e[1], e[2], e[3], e[4], "", {vol:true})));
      if (px.vocab) tasks.push(task("w"+n+"-vo","vocab",px.vocab[0],px.vocab[1],LESSON_INDEXES[px.vocab[2]][1],"",{vol:true}));
    }
    if (nv){
      // keep at least 4 h of input (listening + reading) per week, except in light weeks
      const otherIn = tasks.filter(t => skillOf(t.s).c === "in").reduce((a, t) => a + t.m, 0);
      const inMin = light ? 70 : Math.max(70, Math.ceil((240 - otherIn) / 10) * 10);
      tasks.push(task("w"+n+"-in","input","Input livre: série, podcast ou YouTube com legenda em inglês",inMin,null,(inMin > 70 ? "Mais input nesta semana para manter 4 h de entrada. " : "")+"Vale fora da mesa: trajeto, academia, série à noite.",{vol:true}));
    } else {
      tasks.push(task("w"+n+"-in","input","Input livre: série ou YouTube com legenda em inglês",70,null,"",{vol:true}));
    }
  }
  (d.ms || []).forEach(m => {
    if (m === "bc") tasks.push(levelTestTask(n));
    else if (m === "wi") tasks.push(writeImproveTask(n));
    else if (m.indexOf("ef:") === 0) tasks.push(efsetTask(n, m.slice(3)));
    else if (m.indexOf("cd:") === 0) tasks.push(canDoTask(n, m.slice(3)));
  });
  if (speakOn(n, route)) tasks.push(speakTestTask(n));
  return tasks;
}

export function weekLabel(n){
  if (n >= 53) return "Modelo semanal C1";
  const d = WEEKS[n];
  if (d.label) return d.label;
  const g = d.items.filter(i => typeof i === "string" && LESSONS[i].s === "gram").map(i => LESSONS[i].t);
  return g.length ? g.join("; ") : weekTasks(n)[0].t;
}
export function weekMilestone(n){
  const ms = weekTasks(n).filter(t => t.ms).map(t => t.t);
  return ms.length ? ms.join("; ") : "";
}
export const weekNote = n => { const d = WEEKS[n] || {}; return d.note && (!d.soft || n >= revFromOf(S.state)) ? d.note : ""; };
