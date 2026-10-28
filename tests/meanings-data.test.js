// The shipped meanings pass the checker, and the checker itself catches the mistakes it's there for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAll, checkEntry, readShards, readList, termForms, ptRelated, allowedPos } from "../scripts/check-meanings.mjs";

test("every shipped meaning passes the checks", () => {
  const { errors } = checkAll(readShards(), readList());
  assert.deepEqual(errors, []);
});

test("checker: spellings of the term, Portuguese forms and parts of speech", () => {
  assert.ok(termForms("go").has("went"));
  assert.ok(termForms("stop").has("stopping"));
  assert.ok(termForms("look forward to").has("looking forward to"));
  assert.ok(termForms("credit card").has("credit cards"));
  assert.ok(ptRelated("considero", ["considerar"]));
  assert.ok(ptRelated("tenha", ["ter"]));
  assert.ok(!ptRelated("fitou", ["considerar", "achar"]));
  assert.deepEqual([...allowedPos("noun/verb")], ["noun", "verb"]);
  assert.ok(allowedPos("be-verb").has("verb"));
});

const LIST = {term: "consider", level: "A2", pos: "verb"};
const sense = extra => Object.assign({pos: "verb", pt: ["considerar"], def: "to think carefully about something", ex: "We're considering moving.", form: "considering", exPt: "Estamos considerando nos mudar.", hit: "considerando"}, extra);

test("checker: the mistakes that made cards wrong are errors", () => {
  assert.deepEqual(checkEntry("consider", {pos: "verb", ipa: "kənˈsɪdə", senses: [sense()]}, LIST).errors, []);
  const errs = senses => checkEntry("consider", {pos: "verb", ipa: "", senses}, LIST).errors.join("\n");
  assert.match(errs([sense(), sense({ex: "I consider him a friend.", form: "consider", exPt: "Eu o considero um amigo.", hit: "considero"})]), /like another sense/);
  assert.match(errs([sense(), sense({pt: ["achar"], exPt: "Achamos que sim.", hit: "Achamos"})]), /same example/);
  assert.match(errs([sense({hit: "pensando"})]), /hit "pensando" is not in exPt/);
  assert.match(errs([sense({form: "considered"})]), /not in ex/);
  assert.match(errs([sense({pos: ""})]), /pos missing/);
  assert.match(errs([sense({pt: ["ter (por/como)"]})]), /notes in it/);
  assert.match(checkEntry("consider", {pos: "noun", senses: [sense()]}, LIST).errors.join(), /words.tsv says/);
  assert.match(checkEntry("considerx", {pos: "verb", senses: [sense()]}, undefined).errors.join(), /not in words.tsv/);
  // a hit that isn't one of the sense's words, or a part of speech the list doesn't give, is a warning for a person to look at
  assert.equal(checkEntry("consider", {pos: "verb", senses: [sense({exPt: "Estamos pensando em nos mudar.", hit: "pensando em"})]}, LIST).warnings.length, 1);
  assert.equal(checkEntry("consider", {pos: "verb", senses: [sense({pos: "noun"})]}, LIST).warnings.length, 1);
});
