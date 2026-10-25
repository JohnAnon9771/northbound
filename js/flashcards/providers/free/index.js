/* Free sources, no key needed (all allow CORS), combined into one card:
   - Wiktionary REST: part of speech, definitions and usage examples (works for phrasal verbs and idioms)
   - Tatoeba: real sentences with human pt-BR translations
   - MyMemory: translation of the term and of examples that have no translation
   - Free Dictionary API: IPA and pronunciation audio, when it's up */
import { posPt } from "../../pos.js";
import { getJSON } from "./http.js";
import { wiktionaryUrl, parseWiktionary } from "./wiktionary.js";
import { tatoebaUrl, parseTatoeba } from "./tatoeba.js";
import { translate } from "./mymemory.js";
import { dictionaryUrl, parseDictionary } from "./dictionary.js";

export async function enrichFree(term, context, opts){
  const o = opts || {};
  const t = term.trim(), lower = t.toLowerCase();
  const [wk, tt, tr, dc] = await Promise.allSettled([
    getJSON(wiktionaryUrl(lower)).catch(() => getJSON(wiktionaryUrl(t))).then(parseWiktionary),
    getJSON(tatoebaUrl(lower)).then(j => parseTatoeba(j, lower)),
    translate(t, o.email),
    getJSON(dictionaryUrl(lower), 5000).then(parseDictionary)
  ]);
  let senses = wk.status === "fulfilled" ? wk.value : [];
  // a part-of-speech hint ("verb/noun", from the word list) puts the matching senses first
  if (o.pos){
    // the list says "modal auxiliary", "be-verb"…; Wiktionary calls all of those verbs
    const want = String(o.pos).toLowerCase().split("/").map(w => /verb|auxiliary/.test(w) && w !== "adverb" ? "verb" : w);
    const match = s => want.some(w => String(s.pos).toLowerCase().indexOf(w) === 0);
    senses = senses.filter(match).concat(senses.filter(s => !match(s)));
  }
  const tato = tt.status === "fulfilled" ? tt.value : [];
  const trans = tr.status === "fulfilled" ? tr.value : null;
  const dict = dc.status === "fulfilled" ? dc.value : {};
  if (!senses.length && !tato.length && !trans) throw new Error(tr.reason && tr.reason.message === "quota" ? "quota" : "offline");

  // examples: your own sentence first, then real sentences with human translations, then dictionary examples
  const examples = [];
  const seen = new Set();
  const push = (en, pt) => { const k = en.toLowerCase(); if (!seen.has(k) && examples.length < 3){ seen.add(k); examples.push({en, pt: pt || ""}); } };
  if (context) push(context.trim(), "");
  tato.slice(0, 2).forEach(x => push(x.en, x.pt));
  senses.forEach(s => s.examples.forEach(e => push(e, "")));
  tato.slice(2).forEach(x => push(x.en, x.pt));
  // translate the ones still without pt (costs MyMemory quota, so only these)
  await Promise.all(examples.map(async ex => {
    if (ex.pt) return;
    try { ex.pt = (await translate(ex.en, o.email)).text; } catch (e){ /* keep it untranslated */ }
  }));

  const first = senses[0] || {};
  return {
    term: t, ipa: dict.ipa || "", audio: dict.audio || "",
    pos: posPt(first.pos), translation: trans ? (trans.alts.join(", ") || trans.text) : "",
    definition: first.text || "", examples, collocations: [], cefr: "", notes: "",
    senses: senses.slice(0, 4).map(s => ({pos: posPt(s.pos), text: s.text}))
  };
}
