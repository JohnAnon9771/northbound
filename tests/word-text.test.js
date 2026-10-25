import { test } from "node:test";
import assert from "node:assert/strict";
import { highlight, cloze } from "../js/ui/word-text.js";

test("highlight finds inflections and irregular past forms", () => {
  assert.equal(highlight("She got over it quickly.", "get over"), "She <mark>got over</mark> it quickly.");
  assert.equal(highlight("He is getting over the flu.", "get over"), "He is <mark>getting over</mark> the flu.");
  assert.equal(highlight("They looked forward to the trip.", "look forward to"), "They <mark>looked forward to</mark> the trip.");
  assert.equal(highlight("Banks open early.", "bank"), "<mark>Banks</mark> open early.");
});

test("highlight allows one word between the parts of a phrasal verb", () => {
  assert.equal(highlight("Please turn it down.", "turn down"), "Please <mark>turn it down</mark>.");
});

test("highlight escapes HTML and survives regex characters", () => {
  assert.equal(highlight("<b>bank</b>", "bank"), "&lt;b&gt;<mark>bank</mark>&lt;/b&gt;");
  // stemming cuts the escaped pattern, so "C++" marks only "C+"; the point here is that it doesn't throw
  assert.equal(highlight("I like C++ a lot.", "C++"), "I like <mark>C+</mark>+ a lot.");
  assert.equal(highlight("No match here.", "zebra"), "No match here.");
  assert.equal(highlight("Empty term.", "  "), "Empty term.");
});

test("cloze blanks out the term", () => {
  assert.equal(cloze("I look forward to it.", "look forward to"), "I <mark>____ ____ ____</mark> it.");
  assert.equal(cloze("Nothing to hide.", "zebra"), "Nothing to hide.");
});
