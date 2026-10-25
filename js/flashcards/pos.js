// English part-of-speech names (Wiktionary, the word list) in Portuguese.
const POS_PT = {verb: "verbo", noun: "substantivo", adjective: "adjetivo", adverb: "advérbio", phrase: "expressão", idiom: "expressão idiomática",
  preposition: "preposição", conjunction: "conjunção", interjection: "interjeição", pronoun: "pronome", determiner: "determinante", "prepositional phrase": "locução prepositiva", proverb: "provérbio",
  "modal auxiliary": "verbo modal", "be-verb": "verbo", "do-verb": "verbo", "have-verb": "verbo", number: "numeral", "infinitive-to": "partícula"};
export const posPt = p => POS_PT[String(p || "").toLowerCase()] || String(p || "").toLowerCase();
