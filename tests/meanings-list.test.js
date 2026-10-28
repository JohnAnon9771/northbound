// The ready-made meanings: turning an entry into a card, the lookup, enrich() using it, and old cards taking it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { toCard, refreshed, shardOf, lookupMeanings } from "../js/flashcards/meanings-list.js";
import { enrich } from "../js/flashcards/enrich.js";
import { refreshFromList, addCard, twinOf } from "../js/flashcards/deck.js";
import { S } from "../js/state/store.js";

const CONSIDER = {pos: "verb", ipa: "kənˈsɪdə", senses: [
  {pos: "verb", pt: ["considerar", "pensar em"], def: "to think carefully about something", ex: "We're considering moving to Canada.", form: "considering", exPt: "Estamos pensando em nos mudar para o Canadá.", hit: "pensando em"},
  {pos: "verb", pt: ["achar", "considerar"], def: "to think of someone in a particular way", ex: "I consider him my best friend.", form: "consider", exPt: "Eu o considero meu melhor amigo.", hit: "considero"}
]};
const APPLE = {pos: "noun", ipa: "ˈæpl", senses: [{pos: "noun", pt: ["maçã"], def: "a round fruit", ex: "She eats an apple every day.", form: "apple", exPt: "Ela come uma maçã todo dia.", hit: "maçã"}]};
const SHARDS = {c: {consider: CONSIDER}, a: {apple: APPLE}};

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
function mockFetch(){
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    const m = String(url).match(/meanings\/(\w)\.json$/);
    if (m) return SHARDS[m[1]] ? {ok: true, status: 200, json: async () => SHARDS[m[1]]} : {ok: false, status: 404};
    throw new Error("offline");
  };
  return calls;
}

test("toCard: several senses take turns, each with its own example and translation", () => {
  const c = toCard(CONSIDER, "consider", "");
  assert.equal(c.translation, "considerar, achar");
  assert.equal(c.pos, "verbo");
  assert.equal(c.src, "list");
  assert.deepEqual(c.meanings.map(m => [m.pt[0], m.ex, m.exPt, m.form]), [
    ["considerar", "We're considering moving to Canada.", "Estamos pensando em nos mudar para o Canadá.", "considering"],
    ["achar", "I consider him my best friend.", "Eu o considero meu melhor amigo.", "consider"]
  ]);
  assert.deepEqual(toCard(CONSIDER, "consider", " I'll consider it. ").examples[0], {en: "I'll consider it.", pt: ""});
});

test("toCard: a sense said differently keeps its own sound", () => {
  const tear = {pos: "noun", ipa: "tɪə", senses: [
    {pos: "noun", pt: ["lágrima"], def: "a drop from your eye", ex: "A tear ran down her face.", form: "tear", exPt: "Uma lágrima escorreu pelo rosto dela.", hit: "lágrima", ipa: "tɪə"},
    {pos: "verb", pt: ["rasgar"], def: "to pull apart", ex: "Be careful not to tear the paper.", form: "tear", exPt: "Cuidado para não rasgar o papel.", hit: "rasgar", ipa: "teə"}
  ]};
  assert.deepEqual(toCard(tear, "tear").meanings.map(m => m.ipa), ["tɪə", "teə"]);
  assert.equal(toCard(CONSIDER, "consider").meanings[0].ipa, "");
});

test("toCard: one sense is a plain card", () => {
  const c = toCard(APPLE, "apple");
  assert.deepEqual(c.meanings, []);
  assert.equal(c.translation, "maçã");
  assert.deepEqual(c.examples, [{en: "She eats an apple every day.", pt: "Ela come uma maçã todo dia."}]);
});

test("shards by first letter; missing words and shards read as nothing", async () => {
  assert.equal(shardOf("Consider"), "c");
  assert.equal(shardOf("3D"), "_");
  mockFetch();
  assert.equal((await lookupMeanings(" Consider ")).ipa, "kənˈsɪdə");
  assert.equal(await lookupMeanings("zebra"), null);
  assert.equal(await lookupMeanings("cat"), null);
});

test("enrich: a listed word comes from the list, without the free sources", async () => {
  const calls = mockFetch();
  const r = await enrich("consider", "", {});
  assert.equal(r.source, "list");
  assert.equal(r.data.src, "list");
  assert.equal(r.data.meanings.length, 2);
  assert.equal(r.data.meanings[1].exPt, "Eu o considero meu melhor amigo.");
  assert.ok(calls.every(u => /meanings\/|dictionaryapi/.test(u)));
});

test("refreshed: content replaced, history and your own words kept", () => {
  const old = {id: "x", term: "consider", translation: "ter", meanings: [{pt: ["ter"]}, {pt: ["fitar"]}], context: "Consider yourself lucky.", notes: "minha nota", audio: "https://a/x-uk.mp3", reps: 5, state: "review", due: 9};
  const c = refreshed(old, CONSIDER);
  assert.equal(c.translation, "considerar, achar");
  assert.equal(c.examples[0].en, "Consider yourself lucky.");
  assert.deepEqual([c.notes, c.audio, c.reps, c.state, c.due, c.id], ["minha nota", "https://a/x-uk.mp3", 5, "review", 9, "x"]);
});

test("refreshFromList: old cards and their reverse twins take the list, once", async () => {
  mockFetch();
  S.cards = [];
  const c = addCard({term: "consider", translation: "ter"}, {reverse: true});
  addCard({term: "zebra", translation: "zebra"});
  assert.equal(await refreshFromList(), 1);
  const front = S.cards.find(x => x.id === c.id);
  assert.equal(front.translation, "considerar, achar");
  assert.equal(twinOf(c.id).translation, "considerar, achar");
  assert.equal(S.cards.find(x => x.term === "zebra").translation, "zebra");
  assert.equal(await refreshFromList(), 0);
  S.cards = [];
});
