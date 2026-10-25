// "Palavras do dia" card (Palavras) and its one-line hint (Hoje).
import { S, update } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { plural, pct } from "../core/format.js";
import { toast } from "../core/toast.js";
import { rerender } from "../core/rerender.js";
import { deckToday } from "../flashcards/deck.js";
import { importTerms } from "../flashcards/importer.js";
import { enrichMessage } from "../flashcards/enrich.js";
import { posPt } from "../flashcards/providers/free.js";
import { WL_LEVELS, loadList, levelFor, phaseLevel, nextBatch, advance, withKnown, progress, batchSize, displayTerm, deckTermSet } from "../flashcards/wordlist.js";
import { phaseNow } from "../domain/route.js";

const dw = {list: null, loading: false, error: false, run: null};

function ensureList(){
  if (dw.list || dw.loading) return;
  dw.loading = true; dw.error = false;
  loadList().then(l => { dw.list = l; }).catch(() => { dw.error = true; }).finally(() => { dw.loading = false; rerender(); });
}

function today(){
  const d = deckToday(), phase = phaseNow();
  const level = levelFor(S.state.wl, phase.id);
  const size = batchSize(d);
  const terms = deckTermSet(S.cards);
  const batch = dw.list && size ? nextBatch(dw.list, S.state.wl, level, size, terms) : {level, words: []};
  return {d, phase, level, size, terms, batch};
}

/* For Hoje: {level, n} when a batch is ready to add, else null. Loads the list in the background. */
export function dailyWordsHint(){
  ensureList();
  if (!dw.list || dw.run) return null;
  const t = today();
  return t.batch.words.length ? {level: t.batch.level, n: t.batch.words.length} : null;
}

function waitingText(d){
  if (d.blocked) return "As revisões de hoje passaram de 15 min. As próximas palavras ficam para amanhã.";
  if (d.newWaiting) return "Estude primeiro " + (d.newWaiting === 1 ? "a palavra nova que está" : "as " + d.newWaiting + " palavras novas que estão") + " na fila. O próximo lote aparece quando houver espaço no limite de hoje.";
  return "Lote de hoje feito (" + d.limit + " novas). Amanhã tem mais.";
}

export function dailyWordsHTML(){
  ensureList();
  const accent = S.state.settings.accent;
  let h = '<section class="card section" aria-labelledby="dwT"><div class="section-head"><h2 id="dwT">Palavras do dia</h2>';
  if (!dw.list) return h + "</div>" + (dw.error ? '<p class="note">Não consegui carregar a lista de palavras. <button class="link-btn" type="button" data-act="wl-retry">Tentar de novo</button></p>' : '<div class="loading"><span class="spin"></span>Carregando a lista…</div>') + "</section>";

  const t = today();
  const shown = t.batch.words.length ? t.batch.level : t.level;
  const p = progress(dw.list, S.state.wl, shown, t.terms);
  h += '<span class="pill pill-honey">' + shown + "</span></div>";

  if (dw.run){
    h += '<div class="loading"><span class="spin"></span>Adicionando ' + dw.run.done + " de " + dw.run.total + ' com tradução e exemplos…</div><button class="btn btn-ghost btn-small" type="button" data-act="wl-stop">Parar</button>';
  } else if (!t.size){
    h += '<p class="muted">' + esc(waitingText(t.d)) + "</p>";
  } else if (!t.batch.words.length){
    h += '<p class="muted">Você passou por todas as palavras a partir do ' + t.level + ". Escolha outro nível abaixo se quiser continuar.</p>";
  } else {
    h += '<p class="muted" style="margin-top:0">As ' + plural(t.batch.words.length, "palavra mais usada", "palavras mais usadas") + " do " + t.batch.level + " que você ainda não tem. Toque em “já sei” nas que você conhece: outra entra no lugar.</p>";
    h += '<ul class="wl-list">' + t.batch.words.map(w => '<li><span class="wl-term">' + esc(displayTerm(w, accent)) + "</span>" + (w.pos ? '<span class="wl-pos">' + esc(w.pos.split("/").map(posPt).join(", ")) + "</span>" : "") + (w.level !== t.batch.level ? '<span class="pill">' + w.level + "</span>" : "") + '<button class="link-btn" type="button" data-act="wl-known" data-term="' + esc(w.term) + '" aria-label="Já sei ' + esc(w.term) + '">já sei</button></li>').join("") + "</ul>";
    h += '<div class="row" style="margin-top:14px;align-items:center"><button class="btn" type="button" data-act="wl-add">' + icon("plus", 16) + "Adicionar ao deck (" + t.batch.words.length + ')</button><span class="hint">Leva cerca de ' + Math.max(1, Math.round(t.batch.words.length * 2.5 / 60)) + " min para buscar tudo.</span></div>";
  }

  const sel = S.state.wl.level || "auto";
  h += '<div class="wl-foot"><div class="wl-prog"><div class="progress" role="img" aria-label="' + p.inDeck + " de " + p.total + '"><i style="width:' + pct(p.inDeck + p.known, p.total) + '%"></i></div><span class="hint">' + shown + ": " + p.inDeck + " de " + p.total + " no deck" + (p.known ? " · " + p.known + " você já sabia" : "") + "</span></div>";
  h += '<label class="wl-level"><span class="hint">Nível</span><select data-change="wl-level" aria-label="Nível das palavras do dia">' +
    '<option value="auto"' + (sel === "auto" ? " selected" : "") + ">Pela fase (" + phaseLevel(t.phase.id) + ")</option>" +
    WL_LEVELS.map(l => '<option value="' + l + '"' + (sel === l ? " selected" : "") + ">" + l + "</option>").join("") + "</select></label></div>";
  h += '<p class="hint" style="margin:10px 0 0">Níveis do CEFR-J e do Octanove; ordem por frequência do NGSL.</p>';
  return h + "</section>";
}

/* For Ajustes: the level selector plus progress in every level. */
export function dailyWordsSettingsHTML(){
  ensureList();
  const phase = phaseNow(), sel = S.state.wl.level || "auto";
  let h = '<div class="field"><label for="sWl">Nível das Palavras do dia</label><select id="sWl" data-change="wl-level">' +
    '<option value="auto"' + (sel === "auto" ? " selected" : "") + ">Automático pela fase (agora " + phaseLevel(phase.id) + ")</option>" +
    WL_LEVELS.map(l => '<option value="' + l + '"' + (sel === l ? " selected" : "") + ">" + l + "</option>").join("") + "</select>";
  if (dw.list){
    const terms = deckTermSet(S.cards);
    h += '<ul class="wl-levels">' + WL_LEVELS.map(l => {
      const p = progress(dw.list, S.state.wl, l, terms);
      return '<li><b>' + l + '</b><div class="progress"><i style="width:' + pct(p.inDeck + p.known, p.total) + '%"></i></div><span class="hint">' + p.inDeck + " de " + p.total + (p.known ? " · " + p.known + " já sabia" : "") + "</span></li>";
    }).join("") + "</ul>";
  }
  return h + '<p class="hint">Barras: palavras do nível no deck ou marcadas como “já sei”. A cada dia o site sugere as palavras mais usadas do nível que ainda não estão no deck, até completar o limite de novas.</p></div>';
}

export const dailyWordsActions = {
  "wl-retry"(){ ensureList(); rerender(); },
  "wl-level"(el){ update(s => { s.wl.level = el.value; }); },
  "wl-known"(el){
    const term = el.dataset.term;
    update(s => { s.wl = withKnown(s.wl, term); });
    toast("“" + term + "” fica de fora: você já sabe.", [{label: "Desfazer", fn: () => update(s => { s.wl.known = s.wl.known.filter(k => k !== term); })}]);
  },
  "wl-stop"(){ if (dw.run) dw.run.stop = true; },
  async "wl-add"(){
    if (dw.run || !dw.list) return;
    const t = today();
    const words = t.batch.words;
    if (!words.length) return;
    const accent = S.state.settings.accent;
    const items = words.map(w => ({term: displayTerm(w, accent), pos: w.pos, cefr: w.level, source: "lista", w}));
    const run = dw.run = {done: 0, total: items.length, stop: false, enrich: true};
    rerender();
    const res = await importTerms(items, run, step => {
      run.done++;
      // the cursor moves word by word, so stopping halfway loses nothing and repeats nothing
      update(s => { s.wl = advance(s.wl, [step.item.w]); });
      if (step.quota) toast(enrichMessage("quota"));
    });
    dw.run = null;
    rerender();
    if (res.added) toast(plural(res.added, "palavra nova", "palavras novas") + " no deck.", [{label: "Estudar agora", fn: () => { location.hash = "#estudo"; }}], {tone: "warm"});
  }
};
