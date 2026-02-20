/**
 * 认证工具函数
 * 提供密码哈希、JWT 生成和验证等功能
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// 密码哈希相关
const SALT_ROUNDS = 10;

/**
 * 使用 bcrypt 哈希密码
 * 使用自动生成的salt，安全性高
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 * 使用bcrypt的compare函数进行安全比对
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

type GlobalWithDevJwtSecret = typeof globalThis & {
  __tech_stack_overview_dev_jwt_secret?: string;
  __tech_stack_overview_dev_jwt_secret_warned?: boolean;
};

function resolveJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }

  const globalForJwtSecret = globalThis as GlobalWithDevJwtSecret;
  if (!globalForJwtSecret.__tech_stack_overview_dev_jwt_secret) {
    globalForJwtSecret.__tech_stack_overview_dev_jwt_secret = randomBytes(32).toString("hex");
  }

  if (!globalForJwtSecret.__tech_stack_overview_dev_jwt_secret_warned) {
    console.warn("JWT_SECRET is not set. Using an ephemeral development secret.");
    globalForJwtSecret.__tech_stack_overview_dev_jwt_secret_warned = true;
  }

  return globalForJwtSecret.__tech_stack_overview_dev_jwt_secret;
}

const JWT_EXPIRES_IN = "7d"; // 7天过期

export interface JWTPayload {
  [key: string]: unknown;
  userId: number;
  email: string;
  role: "admin" | "student";
}

interface PasswordResetPayload {
  [key: string]: unknown;
  userId: number;
  purpose: "password_reset";
}

/**
 * 生成 JWT token
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(resolveJwtSecret());
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
  return token;
}

/**
 * 验证 JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(resolveJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * 生成密码重置 token（短期有效）
 */
export async function generatePasswordResetToken(userId: number): Promise<string> {
  const secret = new TextEncoder().encode(resolveJwtSecret());
  return await new SignJWT({ userId, purpose: "password_reset" } as PasswordResetPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secret);
}

/**
 * 校验密码重置 token
 */
export async function verifyPasswordResetToken(
  token: string,
): Promise<PasswordResetPayload | null> {
  try {
    const secret = new TextEncoder().encode(resolveJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    if (payload.purpose !== "password_reset") {
      return null;
    }

    if (typeof payload.userId !== "number") {
      return null;
    }

    return {
      userId: payload.userId,
      purpose: "password_reset",
    };
  } catch {
    return null;
  }
}

/**
 * 从请求头中提取 token
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
