import test from "node:test";
import assert from "node:assert/strict";

import { generateToken, verifyToken } from "../src/lib/auth";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const ENV = process.env as Record<string, string | undefined>;

function restoreEnv() {
  ENV.NODE_ENV = ORIGINAL_NODE_ENV;
  if (ORIGINAL_JWT_SECRET === undefined) {
    delete ENV.JWT_SECRET;
  } else {
    ENV.JWT_SECRET = ORIGINAL_JWT_SECRET;
  }
}

test.afterEach(() => {
  restoreEnv();
});

test("rejects token generation in production when JWT_SECRET is missing", async () => {
  ENV.NODE_ENV = "production";
  delete ENV.JWT_SECRET;

  await assert.rejects(
    generateToken({ userId: 1, email: "u@example.com", role: "student" }),
    /JWT_SECRET is required in production/,
  );
});

test("supports development token flow without configured JWT_SECRET", async () => {
  ENV.NODE_ENV = "development";
  delete ENV.JWT_SECRET;

  const token = await generateToken({ userId: 2, email: "dev@example.com", role: "student" });
  const payload = await verifyToken(token);

  assert.ok(payload);
  assert.equal(payload.userId, 2);
  assert.equal(payload.role, "student");
});

test("invalidates old token when JWT secret changes", async () => {
  ENV.NODE_ENV = "development";
  ENV.JWT_SECRET = "test-secret-1";
  const token = await generateToken({ userId: 3, email: "rot@example.com", role: "admin" });

  ENV.JWT_SECRET = "test-secret-2";
  const payload = await verifyToken(token);

  assert.equal(payload, null);
});
