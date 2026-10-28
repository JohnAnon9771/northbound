// enrichFree and enrich() with fetch replaced by canned API answers (no network).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { enrichFree } from "../js/flashcards/providers/free/index.js";
import { enrich, enrichMessage } from "../js/flashcards/enrich.js";
import { posPt } from "../js/flashcards/pos.js";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const ok = data => ({ok: true, json: async () => data});
const API = {
  wiktionary: {en: [
    {partOfSpeech: "Noun", definitions: [{definition: "A <b>financial</b> institution.", examples: ["She went to the bank to open an account."]}]},
    {partOfSpeech: "Verb", definitions: [{definition: "To rely on something.", examples: []}]}
  ]},
  tatoeba: {data: [
    {text: "The bank opens at nine o'clock.", translations: [[{lang: "por", text: "O banco abre às nove horas.", is_direct: true}]]},
    {text: "I need to go to the bank today.", translations: [[{lang: "por", text: "Preciso ir ao banco hoje."}]]},
    {text: "Is there a bank near the station?", translations: [[{lang: "por", text: "Tem um banco perto da estação?"}]]}
  ]},
  wiktionaryPt: {error: {code: "missingtitle"}},
  dictionary: [{phonetic: "/bæŋk/", phonetics: [{audio: "https://api.dictionaryapi.dev/media/pronunciations/en/bank-uk.mp3"}]}]
};
// routes each URL to a canned answer; `over` replaces some of them (a function or an Error)
function mockFetch(over){
  const o = over || {};
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    const { hostname: host, pathname } = new URL(url);
    const key = pathname.endsWith("api.php") ? "wiktionaryPt" : host.includes("wiktionary") ? "wiktionary" : host.includes("tatoeba") ? "tatoeba" : host.includes("dictionaryapi") ? "dictionary" : "mymemory";
    const v = key in o ? o[key] : key === "mymemory" ? (q => ({responseData: {translatedText: q === "bank" ? "banco" : "(pt) " + q, match: 1}, matches: []})) : API[key];
    if (v instanceof Error) throw v;
    if (typeof v === "function"){ const q = new URL(url).searchParams; return ok(v(q.get("q") || q.get("page"))); }
    return ok(v);
  };
  return calls;
}

// MyMemory answers lose their final period (see parseMyMemory)
test("free card: your sentence first, then Tatoeba, then dictionary examples; only untranslated ones go to MyMemory", async () => {
  const calls = mockFetch();
  const r = await enrichFree("bank", "We sat on the river bank.", {email: "a@b.co"});
  assert.equal(r.translation, "banco");
  assert.equal(r.pos, "substantivo");
  assert.equal(r.definition, "A financial institution.");
  assert.equal(r.ipa, "/bæŋk/");
  assert.match(r.audio, /bank-uk\.mp3$/);
  assert.deepEqual(r.examples, [
    {en: "We sat on the river bank.", pt: "(pt) We sat on the river bank"},
    {en: "The bank opens at nine o'clock.", pt: "O banco abre às nove horas."},
    {en: "I need to go to the bank today.", pt: "Preciso ir ao banco hoje."}
  ]);
  assert.deepEqual(r.senses.map(s => s.pos), ["substantivo", "verbo"]);
  const mm = calls.filter(u => u.includes("mymemory"));
  assert.equal(mm.length, 2);   // the term and your sentence
  assert.ok(mm.every(u => u.includes("de=a%40b.co")));
});

test("a part-of-speech hint puts the matching senses first", async () => {
  mockFetch();
  const r = await enrichFree("bank", "", {pos: "verb"});
  assert.equal(r.pos, "verbo");
  assert.equal(r.definition, "To rely on something.");
});

test("without Tatoeba, dictionary examples fill in and get translated", async () => {
  mockFetch({tatoeba: new Error("down"), dictionary: new Error("down")});
  const r = await enrichFree("bank", "", {});
  assert.deepEqual(r.examples, [{en: "She went to the bank to open an account.", pt: "(pt) She went to the bank to open an account"}]);
  assert.equal(r.ipa, "");
});

test("meanings come from Wiktionary's translation tables (subpage included) before MyMemory", async () => {
  const page = wikitext => ({parse: {wikitext}});
  mockFetch({wiktionaryPt: p => p === "lead" ? page("==English==\n===Noun===\n{{see translation subpage|Noun}}")
    : page("==English==\n====Verb====\n{{trans-top|to guide}}\n* Portuguese: {{t+|pt|conduzir}}\n{{trans-bottom}}\n"
      + "====Noun====\n{{trans-top|precedence}}\n* Portuguese: {{t+|pt|liderança|f}}, {{t|pt|dianteira|f}}\n{{trans-bottom}}\n"
      + "{{checktrans-top}}\n* Portuguese: {{t|pt|superar}}\n{{trans-bottom}}")});
  const r = await enrichFree("lead", "", {pos: "noun"});
  assert.equal(r.translation, "liderança, dianteira");   // the "superar" guess sits in an unchecked table; "conduzir" is a verb
  assert.deepEqual(r.meanings, []);
});

test("nothing found: quota when MyMemory ran out, offline otherwise", async () => {
  const down = new Error("down");
  mockFetch({wiktionary: down, tatoeba: down, dictionary: down, mymemory: () => ({quotaFinished: true})});
  await assert.rejects(enrichFree("bank", "", {}), /quota/);
  mockFetch({wiktionary: down, tatoeba: down, dictionary: down, mymemory: down});
  await assert.rejects(enrichFree("bank", "", {}), /offline/);
});

test("enrich uses the free sources without a key, and falls back to them when Claude fails", async () => {
  mockFetch();
  const free = await enrich("bank", "", {});
  assert.equal(free.source, "free");
  assert.equal(free.data.translation, "banco");
  assert.equal(free.warning, undefined);
  // the Claude SDK comes from a CDN, which node can't import: same path as an API failure
  const fb = await enrich("bank", "", {apiKey: "sk-ant-test"});
  assert.equal(fb.source, "free");
  assert.equal(fb.warning, "A Claude API não respondeu. Usei as fontes gratuitas.");
});

test("messages and part-of-speech names", () => {
  assert.match(enrichMessage("quota"), /limite diário/);
  assert.equal(enrichMessage("nope"), "Não deu para buscar. Preencha à mão.");
  assert.equal(posPt("Modal Auxiliary"), "verbo modal");
  assert.equal(posPt("gerund"), "gerund");
  assert.equal(posPt(null), "");
});
