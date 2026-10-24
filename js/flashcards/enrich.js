// Picks the provider (Claude when there's a key, free sources otherwise) and normalizes the result.
import { enrichFree } from "./providers/free.js";

const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max || 400);

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
    senses: Array.isArray(o.senses) ? o.senses.slice(0, 4) : []
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
