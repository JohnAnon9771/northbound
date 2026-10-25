import { test } from "node:test";
import assert from "node:assert/strict";
import { iso, parse, addDays, mondayOf, daysBetween, shortDate, longDate, startOfDay, endOfDay, isoOf, DAY_MS } from "../js/core/date.js";

test("ISO strings round-trip through local dates", () => {
  assert.equal(iso(parse("2026-03-05")), "2026-03-05");
  assert.equal(iso(parse("2026-3")), "2026-03-01");
  assert.equal(isoOf(new Date(2026, 0, 9, 23, 59).getTime()), "2026-01-09");
});

test("addDays crosses months, years and leap days", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-10-25", 0), "2026-10-25");
});

test("mondayOf and daysBetween", () => {
  assert.equal(mondayOf(new Date(2026, 9, 25)), "2026-10-19");   // Sunday belongs to the week that started Monday
  assert.equal(mondayOf(new Date(2026, 9, 19)), "2026-10-19");
  assert.equal(daysBetween("2026-10-19", "2026-10-25"), 6);
  assert.equal(daysBetween("2026-10-25", "2026-10-19"), -6);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
});

test("pt-BR labels", () => {
  assert.equal(shortDate("2026-10-05"), "5 out");
  assert.equal(longDate("2026-10-25"), "domingo, 25 de outubro");
});

test("start and end of day", () => {
  const t = new Date(2026, 9, 25, 15, 30).getTime();
  assert.equal(startOfDay(t), new Date(2026, 9, 25).getTime());
  assert.equal(endOfDay(t), new Date(2026, 9, 25).getTime() + DAY_MS - 1);
});
