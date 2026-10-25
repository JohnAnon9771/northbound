import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { importTerms, providerOpts } from "../js/flashcards/importer.js";
import { addCard, findByTerm } from "../js/flashcards/deck.js";
import { S, update, setSecret } from "../js/state/store.js";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("without lookups: skips words already in the deck and keeps the list's part of speech and level", async () => {
  addCard({term: "even"});
  const steps = [];
  const res = await importTerms([{term: "even"}, {term: "service", pos: "noun/verb", cefr: "B1", translation: "serviço", source: "lista"}], {enrich: false}, s => steps.push(s));
  assert.deepEqual(res, {added: 1, skipped: 1, quota: false});
  assert.deepEqual(steps.map(s => s.skipped), [true, false]);
  const c = findByTerm("service");
  assert.equal(c.pos, "substantivo, verbo");
  assert.equal(c.cefr, "B1");
  assert.equal(c.translation, "serviço");
  assert.equal(c.source, "lista");
});

test("stopping between words", async () => {
  const run = {enrich: false};
  const res = await importTerms([{term: "one"}, {term: "two"}, {term: "three"}], run, () => { run.stop = true; });
  assert.equal(res.added, 1);
  assert.equal(findByTerm("two"), undefined);
});

test("when the free translation quota runs out, lookups turn off for the rest of the list", async () => {
  globalThis.fetch = async url => {
    if (url.includes("mymemory")) return {ok: true, json: async () => ({quotaFinished: true})};
    throw new Error("down");
  };
  const run = {enrich: true};
  const res = await importTerms([{term: "quota-a"}, {term: "quota-b"}], run, null);
  assert.deepEqual(res, {added: 2, skipped: 0, quota: true});
  assert.equal(run.enrich, false);
});

test("provider options come from settings, secrets and the phase level", () => {
  update(s => { s.settings.claudeModel = "claude-opus-5-5"; s.settings.mmEmail = "a@b.co"; });
  setSecret("claudeKey", "sk-ant-x");
  assert.deepEqual(providerOpts(), {apiKey: "sk-ant-x", model: "claude-opus-5-5", level: "A2", email: "a@b.co"});
  assert.equal(S.secrets.claudeKey, "sk-ant-x");
});
