// Palavras: add words (auto translation + examples), edit the deck, bulk import.
import { S } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { plural } from "../core/format.js";
import { endOfDay } from "../core/date.js";
import { toast } from "../core/toast.js";
import { rerender } from "../core/rerender.js";
import { enrich, enrichMessage, normalizeEnrichment } from "../flashcards/enrich.js";
import { importTerms, providerOpts } from "../flashcards/importer.js";
import { addCard, updateCard, removeCard, restoreCards, findByTerm, deckToday, twinOf, setReverse } from "../flashcards/deck.js";
import { KNOWN_IVL } from "../domain/stats.js";
import { highlight } from "../ui/word-text.js";
import { speakBtn } from "../ui/speech.js";
import { studyStatus } from "../ui/study-status.js";
import { dailyWordsHTML } from "../ui/daily-words-card.js";
import { isFront } from "../flashcards/card.js";

const ui = {
  term: "", context: "", status: "idle", draft: null, reverse: false, warning: "", source: "",
  q: "", filter: "all", limit: 60, editId: null, editDraft: null,
  bulk: "", bulkEnrich: true, bulkRun: null
};


/* ---------- editor (preview of a new card, or editing an existing one) ---------- */
function editorHTML(d, mode){
  const ex = d.examples.length ? d.examples : [{en: "", pt: ""}];
  let h = '<form class="editor" data-submit="' + (mode === "edit" ? "edit-save" : "add-save") + '" data-input="' + (mode === "edit" ? "edit-draft" : "add-draft") + '">';
  h += '<div class="editor-head"><span class="term">' + esc(d.term) + "</span>" + (d.ipa ? '<span class="muted">/' + esc(d.ipa) + "/</span>" : "") + speakBtn(d.term, "Ouvir a palavra", d.audio) + (d.cefr ? '<span class="pill pill-honey">' + esc(d.cefr) + "</span>" : "") + (mode === "add" && ui.source ? '<span class="pill">' + (ui.source === "list" ? "via lista revisada" : ui.source === "claude" ? "via Claude" : "via fontes gratuitas") + "</span>" : "") + "</div>";
  h += '<div class="row"><div class="field" style="flex:2 1 220px"><label>Tradução</label><input type="text" name="translation" data-fk="' + mode + '-tr" value="' + esc(d.translation) + '" placeholder="Ex.: superar"></div><div class="field"><label>Classe</label><input type="text" name="pos" data-fk="' + mode + '-pos" value="' + esc(d.pos) + '" placeholder="verbo"></div></div>';
  h += '<div class="field"><label>Significado (em inglês)</label><input type="text" name="definition" data-fk="' + mode + '-def" value="' + esc(d.definition) + '"></div>';
  if (d.meanings && d.meanings.length > 1){
    h += '<div class="field"><span class="lbl">Sentidos (o cartão alterna um por revisão)</span><ul class="stack" style="gap:6px;margin:0;padding:0;list-style:none">';
    d.meanings.forEach((m, i) => { h += '<li class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><span style="flex:1;min-width:0"><b>' + esc(m.pt.join(", ")) + "</b>" + (m.ipa ? ' <span class="muted">/' + esc(m.ipa) + "/</span>" : "") + ' <span class="muted" style="font-size:14px">' + esc(m.gloss || m.def) + '</span></span><button class="link-btn" type="button" data-act="meaning-del" data-mode="' + mode + '" data-i="' + i + '" aria-label="Tirar o sentido ' + esc(m.pt[0]) + '">×</button></li>'; });
    h += "</ul></div>";
  }
  if (d.senses && d.senses.length > 1 && mode === "add") h += '<details><summary class="muted" style="cursor:pointer;font-size:14px">Outros sentidos no dicionário</summary><ol class="senses">' + d.senses.map(s => "<li>" + esc(s.text) + (s.pos ? " <i>(" + esc(s.pos) + ")</i>" : "") + "</li>").join("") + "</ol></details>";
  h += '<div class="field"><span class="lbl">Exemplos de uso</span><div class="stack" style="gap:8px">';
  ex.forEach((e, i) => { h += '<div class="ex-edit"><textarea name="en' + i + '" data-fk="' + mode + "-en" + i + '" placeholder="Frase em inglês" aria-label="Exemplo ' + (i + 1) + ' em inglês">' + esc(e.en) + '</textarea><textarea name="pt' + i + '" data-fk="' + mode + "-pt" + i + '" placeholder="Tradução" aria-label="Exemplo ' + (i + 1) + ' em português">' + esc(e.pt) + '</textarea><button class="x" type="button" data-act="ex-del" data-mode="' + mode + '" data-i="' + i + '" aria-label="Remover exemplo">×</button></div>'; });
  h += '</div><button class="link-btn" type="button" data-act="ex-add" data-mode="' + mode + '" style="margin-top:8px">+ exemplo</button></div>';
  h += '<div class="row"><div class="field" style="flex:2 1 240px"><label>Collocations</label><input type="text" name="collocations" data-fk="' + mode + '-col" value="' + esc((d.collocations || []).join(", ")) + '" placeholder="separadas por vírgula"></div><div class="field" style="flex:0 1 110px"><label>CEFR</label><input type="text" name="cefr" data-fk="' + mode + '-cefr" value="' + esc(d.cefr) + '" maxlength="2" placeholder="B1"></div></div>';
  h += '<div class="field"><label>Nota</label><input type="text" name="notes" data-fk="' + mode + '-notes" value="' + esc(d.notes) + '" placeholder="Dica, falso cognato, onde você viu…"></div>';
  const rev = mode === "edit" ? !!twinOf(ui.editId) : ui.reverse;
  h += '<label class="check"><input type="checkbox" name="reverse"' + (rev ? " checked" : "") + "> Também treinar ao contrário (português → inglês)</label>";
  h += '<div class="row" style="margin-top:6px"><button class="btn" type="submit">' + icon("check", 18) + (mode === "edit" ? "Salvar" : "Adicionar ao deck") + '</button><button class="btn btn-ghost" type="button" data-act="' + (mode === "edit" ? "edit-cancel" : "add-cancel") + '">Cancelar</button></div>';
  return h + "</form>";
}

function readEditor(form, base){
  const f = new FormData(form);
  const ex = [];
  for (let i = 0; f.has("en" + i); i++){ const en = String(f.get("en" + i)).trim(), pt = String(f.get("pt" + i)).trim(); ex.push({en, pt}); }
  return Object.assign({}, base, {
    translation: String(f.get("translation") || "").trim(), pos: String(f.get("pos") || "").trim(),
    definition: String(f.get("definition") || "").trim(), notes: String(f.get("notes") || "").trim(),
    cefr: String(f.get("cefr") || "").trim().toUpperCase(),
    collocations: String(f.get("collocations") || "").split(",").map(s => s.trim()).filter(Boolean),
    examples: ex, reverse: f.get("reverse") === "on"
  });
}
const cleanExamples = d => Object.assign({}, d, {examples: d.examples.filter(e => e.en)});

/* ---------- deck list ---------- */
function status(c){
  const eod = endOfDay(Date.now());
  if (c.state === "new") return ["nova", "pill"];
  if (c.state !== "review") return ["aprendendo", "pill pill-accent"];
  if (c.due <= eod) return ["revisar hoje", "pill pill-accent"];
  const d = Math.ceil((c.due - eod) / 86400000);
  return [(c.interval >= KNOWN_IVL ? "sabida · " : "") + "em " + d + " d", c.interval >= KNOWN_IVL ? "pill pill-sage" : "pill"];
}
const FILTERS = [["all", "Todas"], ["new", "Novas"], ["learning", "Aprendendo"], ["known", "Sabidas"], ["hard", "Difíceis"]];
function filtered(){
  const q = ui.q.trim().toLowerCase();
  return S.cards.filter(isFront).filter(c => {
    if (ui.filter === "new" && c.state !== "new") return false;
    if (ui.filter === "learning" && !(c.state === "learning" || c.state === "relearning" || (c.state === "review" && c.interval < KNOWN_IVL))) return false;
    if (ui.filter === "known" && !(c.state === "review" && c.interval >= KNOWN_IVL)) return false;
    if (ui.filter === "hard" && !((c.lapses || 0) >= 3 || (c.ease || 2.5) < 1.9)) return false;
    return !q || c.term.toLowerCase().includes(q) || (c.translation || "").toLowerCase().includes(q);
  }).sort((a, b) => (b.created || 0) - (a.created || 0));
}

function deckHTML(){
  const list = filtered();
  let h = '<div class="deck-tools"><div class="search">' + icon("search", 18) + '<input type="search" placeholder="Buscar no deck" value="' + esc(ui.q) + '" data-input="deck-q" data-fk="deck-q" aria-label="Buscar no deck"></div><div class="seg" role="group" aria-label="Filtro">' + FILTERS.map(f => '<button type="button" data-act="deck-filter" data-f="' + f[0] + '" aria-pressed="' + (ui.filter === f[0]) + '">' + f[1] + "</button>").join("") + "</div></div>";
  if (!S.cards.length) return h + '<div class="empty">' + icon("cards", 40) + "<b>Seu deck está vazio</b>Adicione a primeira palavra acima. Dica: use uma frase onde você viu a palavra; ela vira o primeiro exemplo.</div>";
  if (!list.length) return h + '<p class="muted">Nada encontrado.</p>';
  h += '<ul class="deck">';
  list.slice(0, ui.limit).forEach(c => {
    const st = status(c);
    h += '<li><div class="deck-row"><div style="min-width:0"><span class="t">' + esc(c.term) + '</span><div class="tr">' + esc(c.translation || "sem tradução") + (twinOf(c.id) ? " · ↔" : "") + '</div></div><span class="' + st[1] + '">' + esc(st[0]) + '</span><span style="display:flex"><button class="btn-icon btn" type="button" data-act="edit-open" data-id="' + esc(c.id) + '" aria-label="Editar ' + esc(c.term) + '">' + icon("edit", 18) + '</button><button class="btn-icon btn" type="button" data-act="card-del" data-id="' + esc(c.id) + '" aria-label="Apagar ' + esc(c.term) + '">' + icon("trash", 18) + "</button></span></div>";
    if (ui.editId === c.id) h += '<div class="deck-edit">' + editorHTML(ui.editDraft, "edit") + "</div>";
    h += "</li>";
  });
  h += "</ul>";
  if (list.length > ui.limit) h += '<p style="margin-top:12px"><button class="btn btn-ghost btn-small" type="button" data-act="deck-more">Mostrar mais (' + (list.length - ui.limit) + ")</button></p>";
  return h;
}

function bulkHTML(){
  const r = ui.bulkRun;
  let h = '<details class="disc"' + (r || ui.bulk ? " open" : "") + '><summary>' + icon("book", 18) + 'Importar uma lista</summary><div class="disc-body">';
  h += '<p class="muted" style="font-size:14px">Uma palavra ou expressão por linha. Para já informar a tradução, use <code>palavra ; tradução</code>. Serve para trazer palavras do DuoCards, de outra lista ou de um texto.</p>';
  h += '<form data-submit="bulk-run"><div class="field"><textarea name="bulk" data-input="bulk-text" data-fk="bulk" rows="6" placeholder="look forward to\nget over ; superar\nbank"' + (r ? " disabled" : "") + ">" + esc(ui.bulk) + "</textarea></div>";
  h += '<label class="check" style="margin-bottom:12px"><input type="checkbox" data-change="bulk-enrich"' + (ui.bulkEnrich ? " checked" : "") + "> Buscar tradução e exemplos para cada uma (cerca de 2 s por palavra)</label>";
  if (r) h += '<div class="loading"><span class="spin"></span>Importando ' + r.done + " de " + r.total + (r.skipped ? " · " + r.skipped + " já estavam no deck" : "") + '…</div><button class="btn btn-ghost btn-small" type="button" data-act="bulk-stop">Parar</button>';
  else h += '<button class="btn btn-soft" type="submit">Importar</button>';
  return h + "</form></div></details>";
}

export default {
  id: "palavras",
  title: "Palavras",
  render(){
    const d = deckToday();
    const st = studyStatus(d);
    let h = '<div class="hello"><div style="flex:1 1 280px"><p class="eyebrow">Flashcards</p><h1>Palavras</h1><p class="lead">Escreva uma palavra ou expressão. O site busca a tradução e exemplos reais de uso, e você ajusta antes de salvar.</p></div>' +
      '<a class="btn' + (st.ready ? "" : " btn-soft") + '" href="#estudo">' + icon("play", 16) + "Estudar" + (st.ready ? " (" + (d.due + d.fresh) + ")" : "") + "</a></div>";
    h += '<section class="card card-hero section"><h2 style="margin:0">' + (st.ready ? "Hoje: " + esc(st.title) : d.total ? "Tudo em dia por hoje" : "Seu deck está vazio") + '</h2><p class="sub" style="margin:4px 0 0">' + esc(st.ready ? st.why + ". Limite da fase: " + d.limit + " novas por dia, revisões sempre primeiro." : st.why) + "</p>";
    h += '<div class="stat-strip"><div><b class="num">' + d.due + '</b><span>para revisar</span></div><div><b class="num">' + d.newWaiting + '</b><span>novas na fila</span></div><div><b class="num">' + d.total + '</b><span>no deck</span></div><div><b class="num">' + d.known + "</b><span>sabidas (21+ dias)</span></div></div></section>";
    h += dailyWordsHTML();

    h += '<section class="card section" aria-labelledby="addT"><h2 id="addT">Adicionar palavra</h2><form data-submit="add-search"><div class="add-row"><div class="field"><label for="addTerm">Palavra ou expressão</label><input type="text" id="addTerm" name="term" data-input="add-term" data-fk="add-term" value="' + esc(ui.term) + '" placeholder="Ex.: look forward to" autocomplete="off" autocapitalize="off" spellcheck="false"></div><button class="btn" type="submit"' + (ui.status === "loading" ? " disabled" : "") + ">" + icon("search", 18) + 'Buscar</button></div><div class="field" style="margin-top:12px"><label for="addCtx">Frase onde você viu (opcional)</label><input type="text" id="addCtx" name="context" data-input="add-ctx" data-fk="add-ctx" value="' + esc(ui.context) + '" placeholder="Ex.: I\'m really looking forward to the trip."></div></form>';
    const dup = ui.term.trim() && findByTerm(ui.term);
    if (dup && ui.status !== "preview") h += '<p class="note">Você já tem “' + esc(dup.term) + "” no deck" + (dup.translation ? " (" + esc(dup.translation) + ")" : "") + '. <button class="link-btn" type="button" data-act="edit-open" data-id="' + esc(dup.id) + '">Editar</button></p>';
    if (ui.status === "loading") h += '<div class="loading"><span class="spin"></span>Buscando tradução e exemplos…</div>';
    if (ui.status === "error") h += '<p class="note">' + esc(ui.warning) + ' <button class="link-btn" type="button" data-act="add-manual">Preencher à mão</button></p>';
    if (ui.status === "preview"){
      if (ui.warning) h += '<p class="note">' + esc(ui.warning) + "</p>";
      if (ui.draft.examples[0] && ui.draft.examples[0].en) h += '<p class="phrase" style="margin-top:14px">' + highlight(ui.draft.examples[0].en, ui.draft.term) + "</p>";
      h += editorHTML(ui.draft, "add");
    }
    h += "</section>";

    h += '<section class="section" aria-labelledby="deckT"><div class="section-head"><h2 id="deckT">Seu deck</h2><span class="muted">' + plural(d.total, "palavra", "palavras") + "</span></div>" + deckHTML() + "</section>";
    h += '<section class="section">' + bulkHTML() + "</section>";
    return h;
  },
  actions: {
    "add-term"(el){ ui.term = el.value; if (ui.status === "error") ui.status = "idle"; },
    "add-ctx"(el){ ui.context = el.value; },
    async "add-search"(){
      const term = ui.term.trim();
      if (!term){ toast("Escreva uma palavra ou expressão."); return; }
      ui.status = "loading"; ui.warning = ""; rerender();
      try {
        const r = await enrich(term, ui.context.trim(), providerOpts());
        ui.draft = r.data; ui.source = r.source; ui.warning = r.warning || ""; ui.status = "preview";
        if (!r.data.translation && !r.data.examples.length) ui.warning = "Não achei muita coisa para essa. Complete à mão.";
      } catch (e){
        ui.status = "error"; ui.warning = enrichMessage(e && e.message);
      }
      rerender();
    },
    "add-manual"(){ ui.draft = normalizeEnrichment({term: ui.term.trim(), examples: ui.context.trim() ? [{en: ui.context.trim(), pt: ""}] : []}, ui.term.trim()); ui.source = ""; ui.status = "preview"; ui.warning = ""; rerender(); },
    "add-draft"(form){ ui.draft = readEditor(form, ui.draft); ui.reverse = ui.draft.reverse; },
    "add-cancel"(){ ui.status = "idle"; ui.draft = null; rerender(); },
    "add-save"(form){
      const d = cleanExamples(readEditor(form, ui.draft));
      if (findByTerm(d.term) && !confirm("“" + d.term + "” já está no deck. Adicionar mesmo assim?")) return;
      addCard(Object.assign({}, d, {context: ui.context.trim()}), {reverse: d.reverse, source: ui.source || "manual"});
      toast("“" + d.term + "” entrou no deck.");
      ui.term = ""; ui.context = ""; ui.status = "idle"; ui.draft = null; ui.reverse = d.reverse;
      rerender();
      const i = document.getElementById("addTerm"); if (i) i.focus();
    },
    "ex-add"(el){ const d = el.dataset.mode === "edit" ? ui.editDraft : ui.draft; d.examples = d.examples.concat({en: "", pt: ""}); rerender(); },
    // down to one sense, the card stops taking turns and shows that one (as its translation)
    "meaning-del"(el){
      const d = el.dataset.mode === "edit" ? ui.editDraft : ui.draft;
      d.meanings = d.meanings.filter((x, i) => i !== Number(el.dataset.i));
      d.translation = d.meanings.map(m => m.pt[0]).join(", ");
      if (d.meanings.length === 1){ const m = d.meanings[0]; d.translation = m.pt.join(", "); if (m.def) d.definition = m.def; if (m.ipa) d.ipa = m.ipa; if (m.ex && !d.examples.some(e => e.en === m.ex)) d.examples = [{en: m.ex, pt: ""}].concat(d.examples); d.meanings = []; }
      rerender();
    },
    "ex-del"(el){ const d = el.dataset.mode === "edit" ? ui.editDraft : ui.draft; d.examples = d.examples.filter((x, i) => i !== Number(el.dataset.i)); rerender(); },
    "deck-q"(el){ ui.q = el.value; ui.limit = 60; rerender(); },
    "deck-filter"(el){ ui.filter = el.dataset.f; ui.limit = 60; rerender(); },
    "deck-more"(){ ui.limit += 100; rerender(); },
    "edit-open"(el){
      const c = S.cards.find(x => x.id === el.dataset.id);
      if (!c) return;
      ui.editId = c.id; ui.editDraft = JSON.parse(JSON.stringify(c));
      if (!filtered().some(x => x.id === c.id)){ ui.q = c.term; ui.filter = "all"; }
      rerender();
    },
    "edit-draft"(form){ ui.editDraft = readEditor(form, ui.editDraft); },
    "edit-cancel"(){ ui.editId = null; ui.editDraft = null; rerender(); },
    "edit-save"(form){
      const d = cleanExamples(readEditor(form, ui.editDraft));
      const id = ui.editId;
      ui.editId = null; ui.editDraft = null;
      updateCard(id, d);
      setReverse(id, d.reverse);
      toast("Cartão atualizado.");
    },
    "card-del"(el){
      const gone = removeCard(el.dataset.id);
      if (gone.length) toast("“" + gone[0].term + "” saiu do deck.", [{label: "Desfazer", fn: () => restoreCards(gone)}]);
    },
    "bulk-text"(el){ ui.bulk = el.value; },
    "bulk-enrich"(el){ ui.bulkEnrich = el.checked; },
    "bulk-stop"(){ if (ui.bulkRun) ui.bulkRun.stop = true; },
    async "bulk-run"(){
      const items = ui.bulk.split(/\n/).map(l => l.trim()).filter(Boolean).map(l => { const p = l.split(/\s*[;\t]\s*/); return {term: p[0], translation: p[1] || ""}; }).filter(x => x.term);
      if (!items.length){ toast("Cole pelo menos uma palavra."); return; }
      const run = ui.bulkRun = {done: 0, total: items.length, skipped: 0, stop: false, enrich: ui.bulkEnrich};
      rerender();
      const res = await importTerms(items, run, step => {
        run.done++;
        if (step.skipped) run.skipped++;
        if (step.quota){ toast(enrichMessage("quota")); ui.bulkEnrich = false; }
        rerender();
      });
      ui.bulkRun = null;
      if (!run.stop) ui.bulk = "";
      toast(plural(res.added, "palavra importada", "palavras importadas") + (res.skipped ? ", " + res.skipped + " já estavam no deck" : "") + ".");
      rerender();
    }
  }
};
