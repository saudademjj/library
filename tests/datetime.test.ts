import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  addHours,
  addMinutes,
  diffMinutes,
  endOfDay,
  formatDate,
  formatDateTime,
  formatTime,
  isAfter,
  isBefore,
  next24Hours,
  parseDate,
  setTime,
  startOfDay,
} from "../src/lib/datetime";

test("computes Shanghai day boundaries from a zoned timestamp", () => {
  const source = "2026-03-20T12:34:56+08:00";

  assert.equal(startOfDay(source).toISOString(), "2026-03-19T16:00:00.000Z");
  assert.equal(endOfDay(source).toISOString(), "2026-03-20T15:59:59.999Z");
});

test("adds minutes, hours, and days in a deterministic way", () => {
  const source = "2026-03-20T08:00:00+08:00";

  assert.equal(addMinutes(source, 30).toISOString(), "2026-03-20T00:30:00.000Z");
  assert.equal(addHours(source, 2).toISOString(), "2026-03-20T02:00:00.000Z");
  assert.equal(addDays(source, 2).toISOString(), "2026-03-22T00:00:00.000Z");
  assert.equal(next24Hours(source).toISOString(), "2026-03-21T00:00:00.000Z");
});

test("compares and formats dates using the project timezone", () => {
  const earlier = "2026-03-20T09:00:00+08:00";
  const later = "2026-03-20T10:30:00+08:00";

  assert.equal(diffMinutes(later, earlier), 90);
  assert.equal(isBefore(earlier, later), true);
  assert.equal(isAfter(later, earlier), true);
  assert.equal(formatDateTime("2026-03-20T01:05:00.000Z"), "2026年03月20日 09:05");
  assert.equal(formatTime("2026-03-20T01:05:00.000Z"), "09:05");
  assert.equal(formatDate("2026-03-20T23:30:00.000Z"), "2026-03-21");
});

test("parses Shanghai local timestamps and resets the clock precisely", () => {
  const parsed = parseDate("2026-03-20 09:15:00");

  assert.equal(parsed.toISOString(), "2026-03-20T01:15:00.000Z");
  assert.equal(
    setTime("2026-03-20T13:24:59+08:00", 18, 30, 15).toISOString(),
    "2026-03-20T10:30:15.000Z",
  );
});
