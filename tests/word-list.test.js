import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseList, nextBatch, advance, withKnown, levelFor, phaseLevel, progress, batchSize, blankWl, displayTerm, WL_LEVELS } from "../js/flashcards/word-list.js";
import { normalizeState } from "../js/state/schema.js";

const tsv = "# header\nthe\tA1\tdeterminer\t\n" +
  "even\tA2\tadverb\t\nsuch\tA2\tdeterminer\t\nlast\tA2\tadjective\t\ncolor\tA2\tnoun\tcolour\n" +
  "service\tB1\tnoun\t\nable\tB1\tadjective\t\n";
const list = parseList(tsv);
const terms = b => b.words.map(w => w.term);

test("parses levels in file order", () => {
  assert.deepEqual(list.A2.map(e => e.term), ["even", "such", "last", "color"]);
  assert.equal(list.A2[3].alt, "colour");
  assert.equal(list.C1.length, 0);
});

test("level follows the route phase unless fixed", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(phaseLevel), ["A2", "A2", "B1", "B2", "B2", "C1"]);
  assert.equal(levelFor(blankWl(), 2), "B1");
  assert.equal(levelFor(Object.assign(blankWl(), {level: "A1"}), 2), "A1");
});

test("batch skips words in the deck and words you know", () => {
  const wl = withKnown(blankWl(), "such");
  const b = nextBatch(list, wl, "A2", 3, new Set(["even"]));
  assert.deepEqual(terms(b), ["last", "color", "service"]);   // A2 runs out, B1 continues
  assert.equal(b.level, "A2");
});

test("British spelling counts as already in the deck and is shown for en-GB", () => {
  const b = nextBatch(list, blankWl(), "A2", 10, new Set(["colour"]));
  assert.ok(!terms(b).includes("color"));
  assert.equal(displayTerm(list.A2[3], "en-GB"), "colour");
  assert.equal(displayTerm(list.A2[3], "en-US"), "color");
});

test("cursor only moves forward, so nothing repeats", () => {
  let wl = blankWl();
  const b1 = nextBatch(list, wl, "A2", 2, new Set());
  wl = advance(wl, b1.words);
  const b2 = nextBatch(list, wl, "A2", 2, new Set());
  assert.deepEqual(terms(b1), ["even", "such"]);
  assert.deepEqual(terms(b2), ["last", "color"]);
  assert.equal(advance(wl, b1.words).cur.A2, 4 - 2);   // older batch does not move it back
});

test("progress counts deck and known words per level", () => {
  const p = progress(list, withKnown(blankWl(), "last"), "A2", new Set(["even"]));
  assert.deepEqual(p, {total: 4, inDeck: 1, known: 1, left: 2});
});

test("batch size fills the daily limit without piling up", () => {
  assert.equal(batchSize({limit: 10, introduced: 0, newWaiting: 0, blocked: false}), 10);
  assert.equal(batchSize({limit: 10, introduced: 0, newWaiting: 10, blocked: false}), 0);
  assert.equal(batchSize({limit: 10, introduced: 6, newWaiting: 0, blocked: false}), 4);
  assert.equal(batchSize({limit: 10, introduced: 0, newWaiting: 0, blocked: true}), 0);
});

test("state keeps and cleans word-list progress", () => {
  const s = normalizeState({wl: {level: "B1", cur: {A2: 30, B1: -3, Z9: 4}, known: ["even", 3, ""]}});
  assert.equal(s.wl.level, "B1");
  assert.deepEqual(s.wl.cur, {A1: 0, A2: 30, B1: 0, B2: 0, C1: 0});
  assert.deepEqual(s.wl.known, ["even"]);
  assert.equal(normalizeState({}).wl.level, "auto");
});

test("bundled list has every level, no duplicates", () => {
  const real = parseList(readFileSync(new URL("../assets/data/words.tsv", import.meta.url), "utf8"));
  WL_LEVELS.forEach(l => assert.ok(real[l].length > 500, l));
  const all = WL_LEVELS.flatMap(l => real[l].map(e => e.term.toLowerCase().replace(/-/g, " ")));
  assert.equal(new Set(all).size, all.length);
  assert.equal(real.A1[0].term, "the");
});
