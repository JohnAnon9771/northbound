import { test } from "node:test";
import assert from "node:assert/strict";
import { esc } from "../js/core/dom.js";
import { formatHours, pct, plural } from "../js/core/format.js";
import { uid } from "../js/core/id.js";
import { icon } from "../js/core/icons.js";
import { fmtClock } from "../js/core/study-timer.js";

test("esc escapes HTML and treats null as empty", () => {
  assert.equal(esc(`<a href="x">Tom & 'Jerry'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  assert.equal(esc(null), "");
  assert.equal(esc(0), "0");
});

test("hours, percentages and plurals", () => {
  assert.equal(formatHours(90), "1,5");
  assert.equal(formatHours(810), "13,5");
  assert.equal(formatHours(60), "1");
  assert.equal(pct(1, 3), 33);
  assert.equal(pct(5, 0), 0);
  assert.equal(plural(1, "dia", "dias"), "1 dia");
  assert.equal(plural(0, "dia", "dias"), "0 dias");
});

test("ids are unique", () => {
  const ids = new Set(Array.from({length: 500}, uid));
  assert.equal(ids.size, 500);
});

test("icons render known names and an empty svg for unknown ones", () => {
  assert.match(icon("home", 22), /width="22".*<path/);
  assert.match(icon("nope"), /width="20"[^>]*><\/svg>$/);
});

test("timer clock", () => {
  assert.equal(fmtClock(0), "0:00");
  assert.equal(fmtClock(65000), "1:05");
  assert.equal(fmtClock(3600000 + 61000), "1:01:01");
  assert.equal(fmtClock(-5), "0:00");
});
