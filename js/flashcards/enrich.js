// Picks the source (the ready-made list for its words, then Claude when there's a key, free sources otherwise)
// and normalizes the result.
import { enrichFree } from "./providers/free/index.js";
import { lookupMeanings, toCard, LIST_SRC } from "./meanings-list.js";
import { getJSON } from "./providers/free/http.js";
import { dictionaryUrl, parseDictionary } from "./providers/free/dictionary.js";

const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max || 400);

// senses the card takes turns showing (see buildMeanings); fewer than two means no turns
export function normalizeMeanings(list){
  const out = (Array.isArray(list) ? list : []).map(m => ({
    pt: (Array.isArray(m && m.pt) ? m.pt : []).map(t => str(t, 60)).filter(Boolean).slice(0, 3),
    gloss: str(m && m.gloss, 120), def: str(m && m.def, 300), ex: str(m && m.ex, 240), ipa: str(m && m.ipa, 60).replace(/^\/|\/$/g, ""),
    exPt: str(m && m.exPt, 240), form: str(m && m.form, 60)
  })).filter(m => m.pt.length).slice(0, 4);
  return out.length > 1 ? out : [];
}

export function normalizeEnrichment(o, term){
  o = o || {};
  const examples = (Array.isArray(o.examples) ? o.examples : [])
    .map(e => ({en: str(e && e.en, 240), pt: str(e && e.pt, 240)}))
    .filter(e => e.en)
    .slice(0, 4);
  return {
    term: str(o.term || term, 80),
    ipa: str(o.ipa, 60).replace(/^\/|\/$/g, ""),
    audio: String(o.audio || "").split(/\s+/).filter(a => /^https:\/\/\S+$/.test(a)).slice(0, 4).join(" "),
    pos: str(o.pos, 40),
    translation: str(o.translation, 160),
    definition: str(o.definition, 300),
    examples,
    collocations: (Array.isArray(o.collocations) ? o.collocations : []).map(c => str(c, 60)).filter(Boolean).slice(0, 5),
    cefr: /^[ABC][12]$/.test(o.cefr || "") ? o.cefr : "",
    notes: str(o.notes, 300),
    src: o.src === LIST_SRC ? LIST_SRC : "",
    senses: Array.isArray(o.senses) ? o.senses.slice(0, 4) : [],
    meanings: normalizeMeanings(o.meanings)
  };
}

const MSG = {
  quota: "O limite diário da tradução gratuita acabou. Preencha o que faltar à mão ou adicione um e-mail em Ajustes para aumentar o limite.",
  offline: "Não deu para buscar agora (sem conexão?). Preencha à mão.",
  auth: "A chave da Claude API foi recusada. Confira em Ajustes.",
  rate: "A Claude API pediu uma pausa. Usei as fontes gratuitas.",
  refusal: "O Claude não quis gerar este cartão. Usei as fontes gratuitas."
};
export const enrichMessage = code => MSG[code] || "Não deu para buscar. Preencha à mão.";

/* opts: {apiKey, model, level, email}. Returns {data, source, warning?}. */
export async function enrich(term, context, opts){
  const o = opts || {};
  const listed = await lookupMeanings(term);
  if (listed){
    // the list has no recordings: the Free Dictionary's, when it answers quickly
    const dict = await getJSON(dictionaryUrl(term.trim().toLowerCase()), 4000).then(parseDictionary).catch(() => ({}));
    return {data: normalizeEnrichment(Object.assign(toCard(listed, term.trim(), context), {audio: dict.audio || ""}), term), source: LIST_SRC};
  }
  if (o.apiKey){
    try {
      const { enrichClaude } = await import("./providers/claude.js");
      return {data: normalizeEnrichment(await enrichClaude(term, context, o), term), source: "claude"};
    } catch (err){
      const code = err && err.message;
      const data = normalizeEnrichment(await enrichFree(term, context, o), term);
      return {data, source: "free", warning: MSG[code] && code !== "quota" && code !== "offline" ? MSG[code] : "A Claude API não respondeu. Usei as fontes gratuitas."};
    }
  }
  return {data: normalizeEnrichment(await enrichFree(term, context, o), term), source: "free"};
}
