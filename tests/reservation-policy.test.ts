import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CHECKIN_WINDOW_MINUTES,
  getPendingReservationExpiryCutoff,
  isPendingReservationExpired,
} from "../src/lib/reservation-policy";

test("computes pending expiry cutoff from check-in window", () => {
  const now = new Date("2026-02-10T12:00:00.000Z");
  const cutoff = getPendingReservationExpiryCutoff(now, DEFAULT_CHECKIN_WINDOW_MINUTES);

  assert.equal(cutoff.toISOString(), "2026-02-10T11:45:00.000Z");
});

test("treats exactly-window start time as not expired", () => {
  const now = new Date("2026-02-10T12:00:00.000Z");
  const start = new Date("2026-02-10T11:45:00.000Z");

  assert.equal(
    isPendingReservationExpired(start, now, DEFAULT_CHECKIN_WINDOW_MINUTES),
    false,
  );
});

test("marks reservation expired after check-in window", () => {
  const now = new Date("2026-02-10T12:00:00.000Z");
  const start = new Date("2026-02-10T11:44:00.000Z");

  assert.equal(
    isPendingReservationExpired(start, now, DEFAULT_CHECKIN_WINDOW_MINUTES),
    true,
  );
});
