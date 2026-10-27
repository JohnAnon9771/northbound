import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiktionary } from "../js/flashcards/providers/free/wiktionary.js";
import { parseTatoeba } from "../js/flashcards/providers/free/tatoeba.js";
import { parseMyMemory } from "../js/flashcards/providers/free/mymemory.js";
import { parseWiktionaryPt, ptMeanings, buildMeanings } from "../js/flashcards/providers/free/wiktionary-pt.js";
import { parseDictionary } from "../js/flashcards/providers/free/dictionary.js";
import { pickAudio } from "../js/flashcards/audio.js";
import { stripHtml } from "../js/flashcards/providers/free/html.js";
import { normalizeEnrichment, normalizeMeanings } from "../js/flashcards/enrich.js";
import { meaningFor } from "../js/flashcards/card.js";

test("Wiktionary: keeps real senses and short examples, skips 'plural of' entries", () => {
  const senses = parseWiktionary({en: [{partOfSpeech: "Verb", definitions: [
    {definition: "<span>To <a>anticipate</a> with pleasure.</span>", examples: ["I <b>look forward to</b> seeing you.", "short", "a; b; c quotation from 1890 that is long"]},
    {definition: "plural of foo"}
  ]}]});
  assert.equal(senses.length, 1);
  assert.equal(senses[0].text, "To anticipate with pleasure.");
  assert.deepEqual(senses[0].examples, ["I look forward to seeing you."]);
});

test("Tatoeba: needs every word of the term (loosely) and a Portuguese translation", () => {
  const out = parseTatoeba({data: [
    {text: "I'm looking forward to the weekend.", translations: [[{lang: "por", text: "Mal posso esperar pelo fim de semana.", is_direct: true}]]},
    {text: "We look at the forward planning.", translations: [[{lang: "por", text: "x"}]]},
    {text: "I'm looking forward to it so much.", translations: [[{lang: "spa", text: "x"}]]}
  ]}, "look forward to");
  assert.deepEqual(out, [{en: "I'm looking forward to the weekend.", pt: "Mal posso esperar pelo fim de semana."}]);
});

test("MyMemory: prefers the exact source over a fuzzy match for another sentence", () => {
  const q = "I'm really looking forward to the trip.";
  const r = parseMyMemory({responseData: {translatedText: "\"Eu estou realmente ansiosa para o baile.", match: 0.88}, matches: [
    {segment: "\"I'm really looking forward to the ball.", translation: "\"Eu estou realmente ansiosa para o baile.", match: 0.88, quality: 74},
    {segment: q, translation: "Estou realmente ansioso pela viagem.", match: 0.85, quality: 70, "created-by": "MT!"}
  ]}, q);
  assert.equal(r.text, "Estou realmente ansioso pela viagem");
});

test("MyMemory: drops broken encodings, questions and accent-only duplicates", () => {
  const r = parseMyMemory({responseData: {translatedText: "próxima", match: 1}, matches: [
    {segment: "next", translation: "próxima", match: 1}, {segment: "next", translation: "prﾃｳximo", match: 0.99},
    {segment: "next", translation: "Prﾃ³ximo", match: 0.99}, {segment: "next", translation: "do laboratório?", match: 0.99},
    {segment: "next", translation: "proxima", match: 0.99}, {segment: "next", translation: "próximo", match: 0.99}
  ]}, "next");
  assert.deepEqual(r.alts, ["próxima", "próximo"]);
});

// real MyMemory answers (October 2026)
test("MyMemory: alternatives need the exact source, punctuation included", () => {
  const r = parseMyMemory({responseData: {translatedText: "embora", match: 1}, matches: [
    {segment: "though", translation: "embora", match: 1}, {segment: "though", translation: "embora", match: 0.99},
    {segment: "though.", translation: "ninja.", match: 0.98}
  ]}, "though");
  assert.deepEqual(r.alts, ["embora"]);
});

test("MyMemory: drops other scripts and stray two-letter words", () => {
  const r = parseMyMemory({responseData: {translatedText: "pensou", match: 1}, matches: [
    {segment: "thought", translation: "pensou", match: 1}, {segment: "thought ", translation: "pensamos ", match: 0.99},
    {segment: "thought", translation: "em", match: 0.99}, {segment: "thought", translation: "思った", match: 0.99}
  ]}, "thought");
  assert.deepEqual(r.alts, ["pensou", "pensamos"]);
  const jp = parseMyMemory({responseData: {translatedText: "思った", match: 1}, matches: [
    {segment: "thought", translation: "思った", match: 1}, {segment: "thought", translation: "pensamento", match: 0.99}
  ]}, "thought");
  assert.equal(jp.text, "pensamento");
});

test("Wiktionary translations: Portuguese words per sense, unchecked tables left out", () => {
  const wikitext = "==English==\n===Adverb===\n====Translations====\n{{trans-top|id=x|however}}\n* French: {{t+|fr|pourtant}}\n"
    + "* Portuguese: {{t+|pt|[[no]] [[entanto]]}}, {{t|pt|contudo}}\n{{trans-bottom}}\n===Conjunction===\n{{trans-top|although}}\n"
    + "* Portuguese: {{t|pt|embora}}\n*: Brazilian Portuguese: {{t+|pt|apesar}} de\n* Spanish: {{t|es|aunque}}\n{{trans-bottom}}\n"
    + "{{checktrans-top}}\n* Portuguese: {{t|pt|ninja}}\n{{trans-bottom}}\n==French==\n{{trans-top|x}}\n* Portuguese: {{t|pt|não}}";
  const p = parseWiktionaryPt({parse: {wikitext}});
  assert.equal(p.subpage, false);
  assert.deepEqual(p.senses, [
    {ety: 0, pos: "Adverb", gloss: "however", pt: ["no entanto", "contudo"]},
    {ety: 0, pos: "Conjunction", gloss: "although", pt: ["embora", "apesar de"]}
  ]);
  assert.deepEqual(ptMeanings(p.senses, "conjunction"), ["embora", "no entanto", "apesar de", "contudo"]);
  assert.deepEqual(ptMeanings(p.senses), ["no entanto", "embora", "contudo", "apesar de"]);
  assert.equal(parseWiktionaryPt({parse: {wikitext: "==English==\n===Noun===\n{{see translation subpage|Noun}}"}}).subpage, true);
  assert.deepEqual(parseWiktionaryPt({error: {code: "missingtitle"}}).senses, []);
});

test("Wiktionary translations: unlabelled tables count, and unrelated words with the same spelling take turns", () => {
  const p = parseWiktionaryPt({parse: {wikitext: "==English==\n===Etymology 1===\n====Noun====\n{{trans-top|chemical element}}\n* Portuguese: {{t+|pt|chumbo|m}}\n"
    + "{{trans-top|plummet}}\n* Portuguese: {{t+|pt|prumo|m}}\n===Etymology 2===\n====Noun====\n{{trans-top-see|act of leading|conduct}}\n"
    + "* Portuguese: {{t+|pt|condução}}\n{{trans-top}}\n* Portuguese: {{t|pt|liderança}}"}});
  assert.deepEqual(p.senses.map(s => s.ety + ":" + s.pt[0]), ["1:chumbo", "1:prumo", "2:condução", "2:liderança"]);
  assert.deepEqual(ptMeanings(p.senses, "noun"), ["chumbo", "condução", "prumo", "liderança"]);
});

test("stripHtml drops inline styles from Wiktionary", () => {
  assert.equal(stripHtml('A nation. <style data-mw-deduplicate="x">.mw-parser-output .defdate{font-size:smaller}</style><span class="defdate">'), "A nation.");
});

test("MyMemory: quota error is reported", () => {
  assert.throws(() => parseMyMemory({quotaFinished: true}, "x"), /quota/);
});

test("normalizeEnrichment trims, validates and caps fields", () => {
  const n = normalizeEnrichment({translation: "  banco ", cefr: "B9", audio: "http://x", ipa: "/bæŋk/", examples: [{en: "a"}, {en: ""}, {en: "b", pt: "c"}, {en: "d"}, {en: "e"}, {en: "f"}], collocations: ["x", "", "y"]}, "bank");
  assert.equal(n.term, "bank");
  assert.equal(n.translation, "banco");
  assert.equal(n.cefr, "");
  assert.equal(n.audio, "");
  assert.equal(n.ipa, "bæŋk");
  assert.equal(n.examples.length, 4);
  assert.deepEqual(n.collocations, ["x", "y"]);
});

test("stripHtml decodes entities", () => {
  assert.equal(stripHtml("<i>rock &amp; roll</i>&nbsp;&#39;n&#39;"), "rock & roll 'n'");
});

test("recordings follow the accent setting", () => {
  const base = "https://api.dictionaryapi.dev/media/pronunciations/en/hello-";
  const d = parseDictionary([{phonetic: "", phonetics: [{audio: base + "au.mp3"}, {audio: base + "uk.mp3", text: "/həˈləʊ/"}, {audio: "", text: "/həˈloʊ/"}, {audio: base + "us.mp3"}, {audio: "https://x.test/hello.mp3"}]}]);
  assert.equal(d.audio, base + "uk.mp3 " + base + "us.mp3");   // Australian and untagged recordings are dropped
  assert.equal(pickAudio(d.audio, "en-GB"), base + "uk.mp3");
  assert.equal(pickAudio(d.audio, "en-US"), base + "us.mp3");
  assert.equal(pickAudio(base + "au.mp3", "en-GB"), "");          // old cards: no match, the voice speaks
  assert.equal(pickAudio("", "en-GB"), "");
  assert.equal(normalizeEnrichment({audio: d.audio + " http://bad"}, "hello").audio, d.audio);
});

// "lead": the metal (/lɛd/) and leading (/ˈliːd/) are different words with the same spelling
const LEAD = "==English==\n===Etymology 1===\n====Pronunciation====\n* {{IPA|en|/lɛd/|a=RP}}\n====Noun====\n{{trans-top|chemical element}}\n* Portuguese: {{t+|pt|chumbo|m}}\n"
  + "{{trans-top|bullets}}\n* Portuguese: {{t+|pt|chumbo|m}}\n====Verb====\n{{trans-top|to cover with lead}}\n* Portuguese: {{t+|pt|chumbar}}\n"
  + "===Etymology 2===\n====Pronunciation====\n* {{IPA|en|/ˈliːd/}}\n====Verb====\n====Noun====\n{{trans-top|precedence; advance position}}\n* Portuguese: {{t+|pt|liderança}}, {{t|pt|dianteira}}";
const LEAD_REST = parseWiktionary({en: [
  {partOfSpeech: "Noun", definitions: [{definition: "A heavy, pliable metal element."}, {definition: "Bullets fired from a gun.", examples: ["He filled them full of lead."]}]},
  {partOfSpeech: "Verb", definitions: [{definition: "To cover with lead."}]},
  {partOfSpeech: "Verb", definitions: [{definition: "To guide or conduct.", examples: ["She will lead the team to victory."]}]},
  {partOfSpeech: "Noun", definitions: [{definition: "The act of leading."}, {definition: "Precedence; advance position.", examples: ["The white horse had the lead."]}]}
]});

test("Wiktionary: sections and pronunciations per etymology", () => {
  const p = parseWiktionaryPt({parse: {wikitext: LEAD}});
  assert.deepEqual(p.sections, [{ety: 1, pos: "Noun"}, {ety: 1, pos: "Verb"}, {ety: 2, pos: "Verb"}, {ety: 2, pos: "Noun"}]);
  assert.deepEqual(p.ipa, {1: "/lɛd/", 2: "/ˈliːd/"});
});

test("senses to take turns: one per new word, each with its own definition, example and sound", () => {
  const m = buildMeanings(parseWiktionaryPt({parse: {wikitext: LEAD}}), "noun", LEAD_REST);
  assert.deepEqual(m.map(x => x.pt), [["chumbo"], ["liderança", "dianteira"], ["chumbar"]]);   // the "bullets" sense adds nothing new
  assert.deepEqual(m[0], {pt: ["chumbo"], gloss: "chemical element", def: "A heavy, pliable metal element.", ex: "", ipa: "/lɛd/"});
  assert.deepEqual(m[1], {pt: ["liderança", "dianteira"], gloss: "precedence; advance position", def: "Precedence; advance position.", ex: "The white horse had the lead.", ipa: "/ˈliːd/"});
});

test("senses: none for a single sense; no definitions when the REST blocks don't line up; one sound means no ipa", () => {
  const one = parseWiktionaryPt({parse: {wikitext: "==English==\n===Noun===\n{{trans-top|idea}}\n* Portuguese: {{t|pt|pensamento}}\n{{trans-top|process}}\n* Portuguese: {{t|pt|pensamento}}"}});
  assert.deepEqual(buildMeanings(one, "noun", []), []);
  const two = parseWiktionaryPt({parse: {wikitext: "==English==\n===Pronunciation===\n* {{IPA|en|/bæŋk/}}\n===Noun===\n{{trans-top|institution}}\n* Portuguese: {{t|pt|banco}}\n{{trans-top|edge of river}}\n* Portuguese: {{t|pt|margem}}"}});
  const m = buildMeanings(two, "noun", parseWiktionary({en: [{partOfSpeech: "Verb", definitions: [{definition: "An institution."}]}]}));
  assert.deepEqual(m.map(x => [x.pt[0], x.def, x.ipa]), [["banco", "", ""], ["margem", "", ""]]);
});

test("normalizeMeanings: cleans the list and drops it below two senses", () => {
  assert.deepEqual(normalizeMeanings([{pt: ["chumbo", ""], gloss: "metal", ipa: "/lɛd/"}, {pt: []}, {pt: ["liderança"]}]),
    [{pt: ["chumbo"], gloss: "metal", def: "", ex: "", ipa: "lɛd"}, {pt: ["liderança"], gloss: "", def: "", ex: "", ipa: ""}]);
  assert.deepEqual(normalizeMeanings([{pt: ["chumbo"]}]), []);
  assert.deepEqual(normalizeMeanings("x"), []);
  assert.deepEqual(normalizeEnrichment({}, "x").meanings, []);
});

test("a card takes turns between its senses, one per review", () => {
  const meanings = [{pt: ["chumbo"]}, {pt: ["liderança"]}];
  assert.equal(meaningFor({meanings, reps: 0}).pt[0], "chumbo");
  assert.equal(meaningFor({meanings, reps: 3}).pt[0], "liderança");
  assert.equal(meaningFor({meanings: [{pt: ["só"]}], reps: 1}), null);
  assert.equal(meaningFor({}), null);
});
