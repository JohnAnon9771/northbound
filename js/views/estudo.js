// Estudo: focused flashcard session. Space flips, 1-4 answer, swipe left/right on phones.
import { S, addLog } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { plural } from "../core/format.js";
import { endOfDay, addDays, today, parse } from "../core/date.js";
import { rerender } from "../core/rerender.js";
import * as timer from "../core/study-timer.js";
import { buildQueue, preview } from "../flashcards/srs.js";
import { answer, deckToday } from "../flashcards/deck.js";
import { highlight, cloze } from "../ui/word-text.js";
import { speak, speakBtn } from "../ui/speech.js";
import { confetti } from "../ui/confetti.js";
import { studyStatus } from "../ui/study-status.js";
import { isFront } from "../flashcards/card.js";

const MAX_CARD_MS = 60000;   // time on one card counted for stats/log
const GRADE_UI = [[1, "De novo", "g1"], [2, "Difícil", "g2"], [3, "Bom", "g3"], [4, "Fácil", "g4"]];

let ses = null;
const fresh = () => ({cur: null, flipped: false, shownAt: 0, done: 0, good: 0, newSeen: 0, ms: 0, extra: 0, last: null, finished: false, logged: false, startCount: 0});

function queue(){
  const d = deckToday();
  const allowed = ses.extra ? Math.max(0, d.limit + ses.extra - d.introduced) : (d.blocked ? 0 : Math.max(0, d.limit - d.introduced));
  return Object.assign(buildQueue(S.cards, Date.now(), allowed), {d});
}
const related = (a, b) => a && b && (a.id === b.id || a.parent === b.id || b.parent === a.id);
function pickNext(){
  const q = queue(), now = Date.now();
  const avoid = c => related(c, ses.last);
  const pick = list => list.find(c => !avoid(c)) || null;
  const dueLearning = q.learning.filter(c => c.due <= now);
  const c = pick(dueLearning) || pick(q.review) || pick(q.fresh) || pick(q.learning) ||
    dueLearning[0] || q.review[0] || q.fresh[0] || q.learning[0] || null;
  ses.cur = c ? c.id : null;
  ses.flipped = false;
  ses.shownAt = Date.now();
  if (!c) finish();
}
const remaining = () => { const q = queue(); return {learn: q.learning.length, rev: q.review.length, neu: q.fresh.length, total: q.learning.length + q.review.length + q.fresh.length, d: q.d}; };

function finish(){
  if (ses.finished) return;
  ses.finished = true;
  if (ses.done) setTimeout(() => confetti(document.querySelector(".done-card"), ses.done >= 20), 60);
  logSession();
}
function logSession(){
  if (ses.logged || ses.ms < 30000) return;
  ses.logged = true;
  if (timer.running()) return;   // the running timer already counts this time
  addLog({date: today(), min: Math.max(1, Math.round(ses.ms / 60000)), skill: "cards", note: "Flashcards: " + plural(ses.done, "cartão", "cartões")});
}

/* ---------- card faces ---------- */
function exampleFor(c){
  const ex = (c.examples || []).filter(e => e.en);
  return ex.length ? ex[(c.reps || 0) % ex.length] : null;
}
function frontHTML(c){
  const ex = exampleFor(c);
  const kind = c.state === "new" ? ["nova", "pill pill-honey"] : c.state === "review" ? ["revisão", "pill pill-sage"] : ["aprendendo", "pill pill-accent"];
  let h = '<div class="flash-kind"><span class="' + kind[1] + '">' + kind[0] + "</span>" + (!isFront(c) ? '<span class="pill">português → inglês</span>' : "") + "</div>";
  if (!isFront(c)){
    h += '<p class="flash-term">' + esc(c.translation || "(sem tradução)") + "</p>";
    if (ex && ex.pt) h += '<p class="flash-q" style="font-size:20px">' + esc(ex.pt) + "</p>";
    if (ex) h += '<p class="muted" style="margin:0">' + cloze(ex.en, c.term) + "</p>";
    h += '<p class="hint">Como se diz em inglês?</p>';
  } else if (ex){
    h += '<p class="flash-q">' + highlight(ex.en, c.term) + "</p>";
    h += '<p class="hint">O que <b>' + esc(c.term) + "</b> quer dizer aqui?</p>";
  } else {
    h += '<p class="flash-term">' + esc(c.term) + "</p>";
    if (c.pos) h += '<p class="hint">' + esc(c.pos) + "</p>";
  }
  return h;
}
function backHTML(c){
  const shown = exampleFor(c);
  let h = '<div class="flash-back"><div class="row" style="align-items:center;gap:10px"><span class="flash-term" style="font-size:30px">' + esc(c.term) + "</span>" + (c.ipa ? '<span class="muted">/' + esc(c.ipa) + "/</span>" : "") + speakBtn(c.term, "Ouvir " + c.term, c.audio) + "</div>";
  h += '<div class="flash-tr">' + esc(c.translation || "—") + (c.pos ? ' <span class="muted" style="font-size:14px;font-weight:700">' + esc(c.pos) + "</span>" : "") + "</div>";
  if (c.definition) h += '<p class="flash-def">' + esc(c.definition) + "</p>";
  const exs = (c.examples || []).filter(e => e.en);
  const order = shown ? [shown].concat(exs.filter(e => e !== shown)) : exs;
  order.slice(0, 3).forEach(e => { h += '<p class="ex">' + highlight(e.en, c.term) + " " + speakBtnInline(e.en) + (e.pt ? '<span class="pt">' + esc(e.pt) + "</span>" : "") + "</p>"; });
  if (c.collocations && c.collocations.length) h += '<p class="muted" style="margin:0;font-size:14px">Combina com: ' + c.collocations.map(esc).join(" · ") + "</p>";
  if (c.notes) h += '<p class="note">' + esc(c.notes) + "</p>";
  return h + "</div>";
}
const speakBtnInline = text => '<button class="link-btn" type="button" data-act="speak" data-text="' + esc(text) + '" aria-label="Ouvir a frase">' + icon("speak", 16) + "</button>";

function doneHTML(){
  const r = remaining();
  const tomorrowEnd = endOfDay(parse(addDays(today(), 1)).getTime());
  const tomorrow = S.cards.filter(c => c.state !== "new" && !c.suspended && c.due <= tomorrowEnd).length;
  let h = '<section class="card done-card">';
  if (!ses.done){
    h += icon("leaf", 40) + "<h2>Nada para estudar agora</h2>";
    h += '<p class="lead">' + esc(studyStatus(r.d).why) + "</p>";
    if (r.d.newWaiting) h += '<p><button class="btn btn-soft" type="button" data-act="extra">Estudar 5 novas extras</button></p>';
  } else {
    h += icon("star", 40) + "<h2>" + (ses.good / ses.done >= 0.85 ? "Que sessão boa!" : "Sessão concluída") + "</h2>";
    h += '<p class="lead">Cada revisão de hoje deixa a palavra mais firme para a próxima conversa.</p>';
    h += '<div class="done-stats"><div><b>' + ses.done + "</b><span>cartões</span></div><div><b>" + Math.round(100 * ses.good / ses.done) + "%</b><span>acertos</span></div><div><b>" + (ses.ms < 60000 ? Math.round(ses.ms / 1000) + "</b><span>segundos" : Math.round(ses.ms / 60000) + "</b><span>min") + "</span></div></div>";
    if (ses.newSeen) h += "<p>" + plural(ses.newSeen, "palavra nova entrou", "palavras novas entraram") + " no seu vocabulário.</p>";
    h += '<p class="muted">Amanhã: ' + plural(tomorrow, "cartão para revisar", "cartões para revisar") + ".</p>";
    if (ses.logged && !timer.running()) h += '<p class="hint">' + Math.max(1, Math.round(ses.ms / 60000)) + " min registrados como Flashcards.</p>";
    else if (timer.running()) h += '<p class="hint">O cronômetro está ligado, então o tempo entra por ele.</p>';
    if (r.d.newWaiting && !r.total) h += '<p><button class="btn btn-ghost btn-small" type="button" data-act="extra">Estudar 5 novas extras</button></p>';
  }
  h += '<div class="row" style="justify-content:center;margin-top:18px"><a class="btn" href="#hoje">Voltar para Hoje</a><a class="btn btn-ghost" href="#palavras">Adicionar palavras</a></div>';
  return h + "</section>";
}

function answerCur(g){
  const c = S.cards.find(x => x.id === ses.cur);
  if (!c || !ses.flipped) return;
  const ms = Math.min(MAX_CARD_MS, Date.now() - ses.shownAt);
  if (c.state === "new") ses.newSeen++;
  answer(c, g, ms);
  ses.done++; ses.ms += ms;
  if (g >= 3) ses.good++;
  ses.last = c;
  pickNext();
  rerender();
}
function flip(){
  if (!ses.cur || ses.flipped) return;
  ses.flipped = true;
  rerender();
}

export default {
  id: "estudo",
  title: "Estudo",
  focus: true,
  enter(){ ses = fresh(); pickNext(); ses.startCount = remaining().total; },
  leave(){ if (ses) logSession(); ses = null; },
  render(){
    if (!ses){ ses = fresh(); pickNext(); }
    let c = ses.cur ? S.cards.find(x => x.id === ses.cur) : null;
    if (ses.cur && !c){ pickNext(); c = ses.cur ? S.cards.find(x => x.id === ses.cur) : null; }   // card deleted meanwhile
    const r = remaining();
    const total = ses.done + r.total;
    let h = '<div class="study"><div class="study-top"><a class="btn btn-icon btn-ghost" href="#palavras" aria-label="Sair do estudo">' + icon("x", 20) + "</a>";
    h += '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + ses.done + '"><i style="width:' + (total ? Math.round(100 * ses.done / total) : 100) + '%"></i></div>';
    h += '<div class="counts" aria-label="Novas, aprendendo, revisões"><span class="n-new" title="novas">' + r.neu + '</span><span class="n-learn" title="aprendendo">' + r.learn + '</span><span class="n-rev" title="revisões">' + r.rev + "</span></div></div>";
    if (!c){ return h + doneHTML() + "</div>"; }
    h += '<article class="flash" id="flash" aria-live="polite">' + frontHTML(c) + (ses.flipped ? backHTML(c) : "");
    if (!ses.flipped) h += '<div class="reveal"><button class="btn btn-block" type="button" data-act="flip" id="flipBtn">Mostrar resposta</button></div>';
    h += "</article>";
    if (ses.flipped){
      const pv = preview(c, Date.now());
      h += '<div class="grades" role="group" aria-label="Como foi?">' + GRADE_UI.map(([g, label, cls]) => '<button class="grade ' + cls + '" type="button" data-act="grade" data-g="' + g + '"' + (g === 3 ? ' id="goodBtn"' : "") + ">" + label + "<small>" + esc(pv[g]) + "</small><kbd>" + g + "</kbd></button>").join("") + "</div>";
      h += '<p class="hint" style="text-align:center;margin-top:10px">No celular: arraste o cartão para a esquerda (de novo) ou para a direita (bom).</p>';
    }
    return h + "</div>";
  },
  mounted(root){
    const btn = root.querySelector(ses && ses.flipped ? "#goodBtn" : "#flipBtn");
    if (btn) btn.focus({preventScroll: true});
    const card = root.querySelector("#flash");
    if (!card) return;
    let x0 = null, dx = 0;
    card.addEventListener("pointerdown", e => { if (e.pointerType === "mouse" || !ses.flipped || e.target.closest("button")) return; x0 = e.clientX; dx = 0; });
    card.addEventListener("pointermove", e => {
      if (x0 == null) return;
      dx = e.clientX - x0;
      card.classList.toggle("drag-left", dx < -40);
      card.classList.toggle("drag-right", dx > 40);
    });
    const end = () => {
      if (x0 == null) return;
      x0 = null;
      card.classList.remove("drag-left", "drag-right");
      if (dx < -80) answerCur(1); else if (dx > 80) answerCur(3);
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", () => { x0 = null; card.classList.remove("drag-left", "drag-right"); });
    card.addEventListener("click", e => { if (!ses.flipped && !e.target.closest("button")) flip(); });
  },
  onKey(e){
    if (!ses || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "Escape"){ location.hash = "#palavras"; return; }
    if (!ses.cur) return;
    if (!ses.flipped && (e.key === " " || e.key === "Enter")){ e.preventDefault(); flip(); return; }
    if (ses.flipped && /^[1-4]$/.test(e.key)){ e.preventDefault(); answerCur(Number(e.key)); return; }
    if (ses.flipped && e.key === " "){ e.preventDefault(); answerCur(3); return; }
    if (e.key === "r" || e.key === "R"){ const c = S.cards.find(x => x.id === ses.cur); if (c) speak(c.term, c.audio); }
  },
  actions: {
    flip,
    grade(el){ answerCur(Number(el.dataset.g)); },
    extra(){ ses.extra += 5; ses.finished = false; pickNext(); rerender(); }
  }
};
