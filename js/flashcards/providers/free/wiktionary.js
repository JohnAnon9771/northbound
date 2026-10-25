// Wiktionary REST: part of speech, definitions and usage examples (works for phrasal verbs and idioms).
import { stripHtml } from "./html.js";

export const wiktionaryUrl = t => "https://en.wiktionary.org/api/rest_v1/page/definition/" + encodeURIComponent(t.replace(/ /g, "_"));

export function parseWiktionary(json){
  const senses = [];
  ((json && json.en) || []).forEach(block => {
    (block.definitions || []).forEach(d => {
      const text = stripHtml(d.definition);
      if (!text || /^(plural|alternative|obsolete|archaic) (of|form|spelling)/i.test(text)) return;
      senses.push({pos: block.partOfSpeech || "", text, examples: (d.examples || []).map(stripHtml).filter(e => e.length > 8 && e.length < 160 && e.indexOf(";") < 0)});
    });
  });
  return senses;
}
