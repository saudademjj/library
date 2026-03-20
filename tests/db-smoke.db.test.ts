import assert from "node:assert/strict";
import test from "node:test";

import { count } from "drizzle-orm";

import { closeDbConnections, getDb } from "../src/db";
import { reservations, seats, users, zones } from "../src/db/schema";

test.after(async () => {
  await closeDbConnections();
});

test(
  "seeded database contains the expected baseline records",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const db = getDb();

    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    const [{ value: zoneCount }] = await db.select({ value: count() }).from(zones);
    const [{ value: seatCount }] = await db.select({ value: count() }).from(seats);
    const [{ value: reservationCount }] = await db
      .select({ value: count() })
      .from(reservations);

    assert.equal(userCount, 3);
    assert.equal(zoneCount, 3);
    assert.equal(seatCount, 90);
    assert.equal(reservationCount, 3);
  },
);
