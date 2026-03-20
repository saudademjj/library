import assert from "node:assert/strict";
import test from "node:test";

import {
  extractTokenFromHeader,
  generatePasswordResetToken,
  generateToken,
  hashPassword,
  verifyPassword,
  verifyPasswordResetToken,
} from "../src/lib/auth";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const ENV = process.env as Record<string, string | undefined>;

function useStableJwtSecret() {
  ENV.NODE_ENV = "test";
  ENV.JWT_SECRET = "unit-test-secret";
}

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

test("hashes passwords and verifies the original secret", async () => {
  const password = "library-password-123";
  const hashedPassword = await hashPassword(password);

  assert.notEqual(hashedPassword, password);
  assert.equal(await verifyPassword(password, hashedPassword), true);
});

test("rejects an incorrect password for the same hash", async () => {
  const hashedPassword = await hashPassword("correct-password");

  assert.equal(await verifyPassword("wrong-password", hashedPassword), false);
});

test("round-trips password reset tokens with a stable secret", async () => {
  useStableJwtSecret();

  const token = await generatePasswordResetToken(42);
  const payload = await verifyPasswordResetToken(token);

  assert.deepEqual(payload, {
    userId: 42,
    purpose: "password_reset",
  });
});

test("rejects normal access tokens when validating password reset tokens", async () => {
  useStableJwtSecret();

  const accessToken = await generateToken({
    userId: 7,
    email: "admin@example.com",
    role: "admin",
  });

  assert.equal(await verifyPasswordResetToken(accessToken), null);
});

test("extracts bearer tokens only from valid authorization headers", () => {
  assert.equal(extractTokenFromHeader("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(extractTokenFromHeader("Basic abc.def.ghi"), null);
  assert.equal(extractTokenFromHeader(null), null);
});
