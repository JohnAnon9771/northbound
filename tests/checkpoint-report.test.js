import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKPOINTS } from "../js/data/checkpoints.js";
import { levelRank, evidenceFrom, anchorFor, checkpointReport, meets, skillsOf, lastCheckpoint } from "../js/domain/checkpoint-report.js";

const A2P = CHECKPOINTS[12], B1 = CHECKPOINTS[24];
const t = (type, date, o) => Object.assign({id: type + date, type, date, score: "", level: ""}, o || {});
const report = (cp, tests, anchor, feedback) => checkpointReport(cp, evidenceFrom(tests, feedback || []), anchor || "2026-04-01");
const row = (r, skill) => r.rows.find(x => x.skill === skill);
// independent results that meet every A2+ target except speaking
const BASE = [t("efset", "2026-03-30", {score: "40", level: "A2"}), t("wi", "2026-03-28", {level: "B1"})];

test("levels rank on the CEFR scale and EF SET compares by score", () => {
  assert.ok(levelRank("A2+") > levelRank("A2") && levelRank("B1") > levelRank("A2+") && levelRank("B1+") < levelRank("B2"));
  assert.equal(levelRank("xyz"), -1);
  assert.equal(meets({score: 38, level: "A2"}, A2P.targets.list), true);
  assert.equal(meets({score: 37, level: "A2"}, A2P.targets.list), false);
  assert.equal(meets({score: null, level: "A2+"}, A2P.targets.read), true);
  assert.equal(meets({score: null, level: "A2"}, A2P.targets.writ), false);
});

test("evidence: EF SET and BC count for listening and reading, W&I for writing, ChatGPT is weak", () => {
  const ev = evidenceFrom([t("efset", "2026-03-01", {score: "44"}), t("bc", "2026-03-01", {level: "B1"}), t("wi", "2026-03-01", {level: "A2+"}), t("gpt", "2026-03-01", {level: "B1"})],
    [{kind: "conv", date: "2026-03-02", level: "B1"}, {kind: "writ", date: "2026-03-02", level: "A2"}, {kind: "conv", date: "2026-03-02", level: ""}]);
  const by = ev.map(e => e.src + ":" + e.skill + ":" + (e.strong ? "s" : "w"));
  assert.deepEqual(by, ["efset:list:s", "efset:read:s", "bc:list:s", "bc:read:s", "wi:writ:s", "gpt:speak:w", "diario-conv:speak:w", "diario-writ:writ:w"]);
  assert.equal(ev[0].level, "B1");   // EF SET level filled from the score
  assert.deepEqual(skillsOf({type: "outro"}), []);
  assert.deepEqual(skillsOf({type: "outro", skill: "speak"}), ["speak"]);
  assert.deepEqual(skillsOf({type: "gpt", skill: "writ"}), ["writ"]);
});

test("the window runs from 28 days before to 14 days after the anchor", () => {
  const at = d => row(report(A2P, [t("wi", d, {level: "B1"})], "2026-04-01"), "writ").status;
  assert.equal(at("2026-03-04"), "met");    // -28
  assert.equal(at("2026-03-03"), "none");   // -29
  assert.equal(at("2026-04-15"), "met");    // +14
  assert.equal(at("2026-04-16"), "none");   // +15
});

test("the latest result wins, ties go to the one logged last", () => {
  const r = report(A2P, [t("efset", "2026-03-20", {score: "45"}), t("efset", "2026-03-25", {score: "35"})]);
  assert.equal(row(r, "list").status, "below");
  assert.equal(row(r, "list").ev.score, 35);
  const tie = report(A2P, [t("wi", "2026-03-25", {level: "A2"}), t("wi", "2026-03-25", {level: "B1"})]);
  assert.equal(row(tie, "writ").status, "met");
});

test("an independent result beats a newer weak one", () => {
  const r = report(A2P, [t("wi", "2026-03-10", {level: "A2"})], "2026-04-01", [{kind: "writ", date: "2026-03-30", level: "B1"}]);
  assert.equal(row(r, "writ").status, "below");
  assert.equal(row(r, "writ").weak, false);
});

test("speaking from ChatGPT alone is met but weak, so the level is not proven", () => {
  const r = report(A2P, BASE.concat(t("gpt", "2026-03-29", {level: "B1"})), "2026-04-01", [{kind: "conv", date: "2026-03-31", level: "B1"}]);
  assert.equal(row(r, "speak").status, "met");
  assert.equal(row(r, "speak").weak, true);
  assert.equal(r.met, 3);
  assert.equal(r.proven, false);
});

test("an 'outro' result with a skill is independent; without one it is ignored", () => {
  const r = report(A2P, BASE.concat(t("outro", "2026-03-29", {level: "B1", skill: "speak"})));
  assert.equal(row(r, "speak").weak, false);
  assert.equal(r.met, 4);
  assert.equal(r.proven, true);
  const none = report(A2P, BASE.concat(t("outro", "2026-03-29", {level: "B1"})));
  assert.equal(row(none, "speak").status, "none");
  assert.equal(none.proven, false);
});

test("no evidence leaves every row empty", () => {
  const r = report(B1, []);
  assert.deepEqual(r.rows.map(x => x.status), ["none", "none", "none", "none"]);
  assert.equal(r.met, 0);
});

test("the anchor is the last milestone done, else today", () => {
  assert.equal(anchorFor(["w12-ef", "w12-cd"], {"w12-ef": "2026-03-02", "w12-cd": "2026-03-05", other: "2026-04-01"}, "2026-05-01"), "2026-03-05");
  assert.equal(anchorFor(["w12-ef"], {"w12-ef": true}, "2026-05-01"), "2026-05-01");
  assert.equal(anchorFor(["w12-ef"], {}, "2026-05-01"), "2026-05-01");
});

test("the last checkpoint reached in a phase", () => {
  assert.equal(lastCheckpoint(13, 26, 20), null);
  assert.equal(lastCheckpoint(13, 26, 25), 24);
  assert.equal(lastCheckpoint(13, 26, 30), 26);
  assert.equal(lastCheckpoint(27, 44, 40), 36);
});
