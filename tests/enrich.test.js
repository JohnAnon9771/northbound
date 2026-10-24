import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiktionary, parseTatoeba, parseMyMemory, stripHtml } from "../js/flashcards/providers/free.js";
import { normalizeEnrichment } from "../js/flashcards/enrich.js";

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
