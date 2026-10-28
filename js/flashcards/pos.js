// English part-of-speech names (Wiktionary, the word list) in Portuguese.
const POS_PT = {verb: "verbo", noun: "substantivo", adjective: "adjetivo", adverb: "advérbio", phrase: "expressão", idiom: "expressão idiomática",
  preposition: "preposição", conjunction: "conjunção", interjection: "interjeição", pronoun: "pronome", determiner: "determinante", "prepositional phrase": "locução prepositiva", proverb: "provérbio",
  "modal auxiliary": "verbo modal", "be-verb": "verbo", "do-verb": "verbo", "have-verb": "verbo", number: "numeral", "infinitive-to": "partícula"};
export const posPt = p => POS_PT[String(p || "").toLowerCase()] || String(p || "").toLowerCase();

// a part-of-speech hint ("verb/noun", from the word list) puts the matching items first;
// the list says "modal auxiliary", "be-verb"…, Wiktionary calls all of those verbs
const posMatcher = pos => {
  const want = String(pos).toLowerCase().split("/").map(w => /verb|auxiliary/.test(w) && w !== "adverb" ? "verb" : w);
  return s => want.some(w => String(s.pos).toLowerCase().indexOf(w) === 0);
};
export function posFirst(items, pos){
  if (!pos) return items;
  const match = posMatcher(pos);
  return items.filter(match).concat(items.filter(s => !match(s)));
}
// only the items of the hinted part of speech, when there are any ("time" the noun leaves out "to time")
export function posOnly(items, pos){
  if (!pos) return items;
  const hit = items.filter(posMatcher(pos));
  return hit.length ? hit : items;
}
