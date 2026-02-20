/**
 * Hono 中间件
 */

import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { verifyToken, extractTokenFromHeader, type JWTPayload } from "./auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";

// 扩展 Hono Context 类型，添加 user 属性
export interface AuthContext {
  user: JWTPayload;
}

type AuthUserRecord = {
  id: number;
  email: string;
  role: "admin" | "student";
  isActive: boolean | null;
};

type LoadAuthUser = (userId: number) => Promise<AuthUserRecord | null>;

async function loadAuthUserFromDb(userId: number): Promise<AuthUserRecord | null> {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function resolveCurrentUserFromPayload(
  payload: JWTPayload,
  loadAuthUser: LoadAuthUser = loadAuthUserFromDb,
): Promise<JWTPayload | null> {
  const user = await loadAuthUser(payload.userId);
  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

/**
 * 认证中间件
 * 验证 JWT token 并将用户信息添加到 context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = extractTokenFromHeader(authHeader ?? null);

  if (!token) {
    return c.json({ ok: false, error: "未提供认证 token" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "无效或过期的 token" }, 401);
  }

  const currentUser = await resolveCurrentUserFromPayload(payload);
  if (!currentUser) {
    return c.json({ ok: false, error: "用户不存在或已被禁用" }, 401);
  }

  // 将用户信息添加到 context
  c.set("user", currentUser);
  await next();
}

/**
 * 可选认证中间件
 * 如果提供了 token 则验证，但不强制要求
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = extractTokenFromHeader(authHeader ?? null);

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const currentUser = await resolveCurrentUserFromPayload(payload);
      if (currentUser) {
        c.set("user", currentUser);
      }
    }
  }

  await next();
}

/**
 * 管理员权限中间件
 * 必须先使用 authMiddleware
 */
export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get("user") as JWTPayload | undefined;

  if (!user) {
    return c.json({ ok: false, error: "需要认证" }, 401);
  }

  if (user.role !== "admin") {
    return c.json({ ok: false, error: "需要管理员权限" }, 403);
  }

  await next();
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(c: Context): JWTPayload | null {
  return c.get("user") as JWTPayload | null;
}
