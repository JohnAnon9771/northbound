// "Can I study now, and if not, why?" Shared by Hoje, Palavras and the study screen.
import { S } from "../state/store.js";
import { plural } from "../core/format.js";
import { daysBetween, isoOf, shortDate } from "../core/date.js";

// earliest due time among cards already in rotation (new cards don't count)
export function nextReviewOf(cards){
  let next = Infinity;
  cards.forEach(c => { if (c.state !== "new" && !c.suspended && c.due < next) next = c.due; });
  return isFinite(next) ? next : null;
}

function whenText(ts, now){
  const min = Math.round((ts - now) / 60000);
  if (min < 60) return "daqui a " + Math.max(1, min) + " min";
  const days = daysBetween(isoOf(now), isoOf(ts));
  if (days <= 0) return "hoje, daqui a " + Math.round(min / 60) + " h";
  if (days === 1) return "amanhã";
  return "em " + days + " dias (" + shortDate(isoOf(ts)) + ")";
}

/* d = deckToday(), next = nextReviewOf(cards). Returns {ready, title, why}: `why` explains an empty queue. */
export function studyStatusAt(d, next, now){
  if (d.due || d.fresh){
    const parts = [];
    if (d.due) parts.push(plural(d.due, "revisão", "revisões"));
    if (d.fresh) parts.push(plural(d.fresh, "nova", "novas"));
    return {ready: true, title: parts.join(" + "), why: "cerca de " + d.minutes + " min" + (d.blocked && d.newWaiting ? ". Revisões passaram de 15 min: sem novas hoje" : "")};
  }
  if (!d.total) return {ready: false, title: "deck vazio", why: "Adicione palavras em Palavras para ter o que estudar."};
  const nextTxt = next ? "Próxima revisão " + whenText(next, now) + "." : "";
  if (d.newWaiting && d.blocked) return {ready: false, title: "em dia", why: "As revisões de hoje passaram de 15 min, então as novas ficam para amanhã. " + nextTxt};
  if (d.newWaiting) return {ready: false, title: "em dia", why: "Você já viu " + (d.limit === 1 ? "a palavra nova" : "as " + d.limit + " palavras novas") + " de hoje (" + plural(d.newWaiting, "espera", "esperam") + " na fila). " + nextTxt};
  return {ready: false, title: "em dia", why: (d.reviewedToday ? "Tudo revisado por hoje. " : "Nada vence hoje. ") + nextTxt};
}
export const studyStatus = d => studyStatusAt(d, nextReviewOf(S.cards), Date.now());
