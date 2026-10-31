// The checkpoint report (boletim) for Rota and Níveis: per skill, the evidence near the checkpoint against its target.
import { S } from "../state/store.js";
import { cached } from "../state/memo.js";
import { esc } from "../core/dom.js";
import { today, shortDate } from "../core/date.js";
import { SKILLS } from "../data/skills.js";
import { CAN_DO } from "../data/can-do.js";
import { CHECKPOINTS, REVISE } from "../data/checkpoints.js";
import { weekTasks } from "../domain/week-tasks.js";
import { currentRoadmapWeek } from "../domain/pace.js";
import { SOURCES, evidenceFrom, anchorFor, checkpointReport } from "../domain/checkpoint-report.js";

// null for weeks that aren't checkpoints or aren't reached yet
export function reportFor(n){
  const cp = CHECKPOINTS[n];
  if (!cp || n > currentRoadmapWeek()) return null;
  return cached("cp" + n + today(), () => {
    const ms = weekTasks(n).filter(t => t.ms).map(t => t.k);
    return checkpointReport(cp, evidenceFrom(S.state.tests, S.state.feedback), anchorFor(ms, S.state.done, today()));
  });
}

const CD_SUFFIX = {list: "l", read: "r", writ: "w", speak: "p"};
const CD_ANSWER = ["não", "com ajuda", "sim"];
function candoHint(skill, level){
  const lv = level.replace("+", ""), id = lv.toLowerCase() + "-" + CD_SUFFIX[skill];
  const v = S.state.cando[id];
  return CAN_DO[lv] && v != null && CD_ANSWER[v] ? "Autoavaliação “can-do” " + lv + ": " + CD_ANSWER[v] + "." : "";
}
const targetText = t => t.ef != null ? "EF SET " + t.ef + "+ ou " + t.level : t.level;
const BADGE = {met: "Atingido", weak: "Atingido, evidência fraca", below: "Abaixo", none: "Sem evidência"};

function rowHTML(r){
  const key = r.status === "met" && r.weak ? "weak" : r.status;
  const ev = r.ev ? esc(SOURCES[r.ev.src].name + " " + (r.ev.score != null ? r.ev.score + " (" + r.ev.level + ")" : r.ev.level)) + ", " + esc(shortDate(r.ev.date)) : "nenhum resultado";
  let tip = "";
  if (r.status === "below") tip = "Revise: " + REVISE[r.skill];
  else if (r.weak) tip = r.skill === "speak" ? "Nota do ChatGPT é evidência fraca. Para comprovar, registre em Níveis uma avaliação de professor ou prova oficial (Outro, Speaking)." : "Nota do ChatGPT é evidência fraca. Confirme com o Write & Improve.";
  else if (r.status === "none") tip = "Registre um resultado em Níveis.";
  const cd = candoHint(r.skill, r.target.level);
  return '<li class="rep-row rep-' + key + '"><span class="rep-skill">' + SKILLS[r.skill].n + '</span><span class="rep-badge">' + BADGE[key] + '</span><span class="rep-ev">' + ev + " · meta " + esc(targetText(r.target)) + "</span>" +
    (tip || cd ? '<span class="rep-tip">' + esc([tip, cd].filter(Boolean).join(" ")) + "</span>" : "") + "</li>";
}

export function reportHTML(n){
  const cp = CHECKPOINTS[n];
  if (!cp) return "";
  const r = reportFor(n);
  let h = '<div class="report"><div class="rep-head"><h3>Boletim do checkpoint ' + esc(cp.level) + "</h3>";
  if (!r){
    h += '</div><p class="hint">Metas: Listening e Reading com ' + esc(targetText(cp.targets.list)) + ", Writing e Speaking em " + esc(cp.level) + ". O boletim abre quando você chegar nesta semana.</p></div>";
    return h;
  }
  h += '<span class="pace ' + (r.proven ? "pace-ok" : "pace-behind") + '">' + (r.proven ? esc(cp.level) + " comprovado" : r.met + " de 4 habilidades comprovadas") + "</span></div>";
  h += '<ul class="rep-rows">' + r.rows.map(rowHTML).join("") + "</ul>";
  h += '<p class="hint">Conta o teste independente mais recente entre ' + esc(shortDate(r.from)) + " e " + esc(shortDate(r.to)) + '. Concluir a semana não depende do boletim: ele mostra se o nível foi comprovado. <a href="#niveis">Registrar resultado</a></p>';
  return h + "</div>";
}
