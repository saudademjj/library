import test from "node:test";
import assert from "node:assert/strict";

import { resolveCurrentUserFromPayload } from "../src/lib/middleware";

test("returns null when user record does not exist", async () => {
  const payload = { userId: 10, email: "x@example.com", role: "student" as const };

  const currentUser = await resolveCurrentUserFromPayload(payload, async () => null);

  assert.equal(currentUser, null);
});

test("returns null for disabled users", async () => {
  const payload = { userId: 11, email: "disabled@example.com", role: "student" as const };

  const currentUser = await resolveCurrentUserFromPayload(payload, async () => ({
    id: 11,
    email: "disabled@example.com",
    role: "student",
    isActive: false,
  }));

  assert.equal(currentUser, null);
});

test("uses latest role and email from database record", async () => {
  const payload = { userId: 12, email: "old@example.com", role: "student" as const };

  const currentUser = await resolveCurrentUserFromPayload(payload, async () => ({
    id: 12,
    email: "new@example.com",
    role: "admin",
    isActive: true,
  }));

  assert.deepEqual(currentUser, {
    userId: 12,
    email: "new@example.com",
    role: "admin",
  });
});
