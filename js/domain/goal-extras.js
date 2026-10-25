// Goal hours above the base route become extra reading, listening and conversation tasks.
import { S } from "../state/store.js";
import { cached } from "../state/memo.js";
import { LINKS, EER_LEVEL_URL } from "../data/lessons.js";
import { task, WEEKS } from "../data/weeks.js";
import { WEEK_SPLIT } from "../data/skills.js";

/* Extras above the base route. The base route fits 13.5 h a week (810 min). Hours above that become extra tasks:
   two thirds reading with audio (English e-Reader, plus News in Levels in phases 0 to 2),
   logged half as Reading and half as Listening, and one third extra conversation. Like the route's volume tasks,
   extras must be done to close a week early, but stay behind once the week's time is up. */
export const BASE_MIN = 810;
const r10 = v => Math.round(v / 10) * 10;
export function extraPlanFor(goalH){
  const extra = Math.max(0, r10(goalH * 60 - BASE_MIN));
  let ext = r10(extra * 2 / 3), conv = extra - ext;
  if (conv < 30){ ext += conv; conv = 0; }
  return {extra, ext, conv};
}
export const extraPlan = () => extraPlanFor(S.state.settings.goalH);
const EER = [[1,"A2 elementary","elementary"],[13,"B1 pre-intermediate","pre-intermediate"],[27,"B1+ intermediate","intermediate"],[36,"B2 intermediate-plus","intermediate-plus"],[53,"B2+ upper-intermediate","upper-intermediate"]];
function eerFor(n){ let r = EER[0]; EER.forEach(e => { if (n >= e[0]) r = e; }); return r; }
export const extraTasks = n => cached("x" + n, () => buildExtras(n, S.state.settings.goalH));
export function buildExtras(n, goalH){
  const out = [], x = extraPlanFor(goalH);
  if (x.extra > 0){
    const d = WEEKS[n] || {}, light = n <= 52 && !!(d.light || d.soft);
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
      out.push(task("x"+n+"-eer","read","English e-Reader, "+lv[1]+": livro com áudio",book,n === 1 ? LINKS.eerQuiz : EER_LEVEL_URL+lv[2],note,{x:true, mix:mix(book)}));
    }
    if (news){
      const l = n <= 12 ? 2 : 3;
      out.push(task("x"+n+"-nil","read","News in Levels, nível "+l+": 2 notícias por dia",news,l === 2 ? LINKS.nil2 : LINKS.nil3,"Leia, depois ouça o áudio lendo junto e, por fim, só ouvindo. No dia seguinte, releia as de ontem e veja se lembra das palavras novas."+(l === 2 ? " Se estiver difícil, comece pelo nível 1." : ""),{x:true, mix:mix(news)}));
    }
    if (conv) out.push(task("x"+n+"-cv","conv","ChatGPT: conversa extra no modo voz",conv,"#rotinas","Prompt 2 ou 3, com um tema que apareceu nas leituras da semana.",{x:true}));
  }
  return out;
}
// minutes per skill in a week: the base split scaled to the goal, plus the extras (merged into reading/listening or apart)
export function splitFor(goalH, merge){
  const g = goalH * 60, x = extraPlanFor(goalH), f = Math.min(1, g / BASE_MIN);
  const rows = WEEK_SPLIT.map(s => [s[0], s[1], s[2] * f]);
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
export const planSplit = merge => splitFor(S.state.settings.goalH, merge);
