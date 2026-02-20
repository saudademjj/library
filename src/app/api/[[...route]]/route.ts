import { Hono } from "hono";
import { handle } from "hono/vercel";
import { desc, eq, and, gt, lt, sql, count, inArray } from "drizzle-orm";
import QRCode from "qrcode";

import { getDb } from "@/db";
import { users, zones, seats, reservations } from "@/db/schema";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/auth";
import { authMiddleware, adminMiddleware, getCurrentUser } from "@/lib/middleware";
import {
  now,
  startOfDay,
  endOfDay,
  addMinutes,
  addDays,
  next24Hours,
  diffMinutes,
  isBefore,
  isAfter,
  toChineseTime,
  parseDate
} from "@/lib/datetime";
import { DEFAULT_CHECKIN_WINDOW_MINUTES, getPendingReservationExpiryCutoff } from "@/lib/reservation-policy";
import type {
  LoginRequest,
  RegisterRequest,
  CreateZoneRequest,
  UpdateZoneRequest,
  CreateSeatRequest,
  UpdateSeatRequest,
  CreateReservationRequest,
  UpdateReservationRequest,
} from "@/lib/types";

export const runtime = "nodejs";

type SeatInsert = typeof seats.$inferInsert;
type SeatListItem = typeof seats.$inferSelect & {
  displayStatus: "free" | "limited" | "occupied" | "locked";
  availableUntil: string | null;
  nextReservationAt: string | null;
};
type SeatsCacheEntry = {
  data: SeatListItem[];
  expiresAt: number;
};
type GlobalWithSeatsCache = typeof globalThis & {
  __tech_stack_overview_seats_cache?: Map<string, SeatsCacheEntry>;
  __tech_stack_overview_pending_cleanup_at?: number;
};

type SeatLayoutInput = {
  id?: number | string;
  seatNumber?: string;
  x?: number;
  y?: number;
  rotation?: number;
  seatType?: SeatInsert["seatType"];
  facilities?: unknown;
};

const app = new Hono().basePath("/api");

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 全局错误处理
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    },
    500,
  );
});

app.notFound((c) => c.json({ ok: false, error: "Not Found" }, 404));

// 基础路由
app.get("/", (c) => c.json({ ok: true, message: "图书馆座位预约系统 API" }));
app.get("/health", (c) => c.json({ ok: true }));

// ============================================
// 认证路由
// ============================================

// 用户注册
app.post("/auth/register", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as RegisterRequest;
  const { name, email, password, studentId, phone } = body;

  // 验证必填字段
  if (!name || !email || !password || !studentId) {
    return c.json({ ok: false, error: "缺少必填字段" }, 400);
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ ok: false, error: "邮箱格式无效" }, 400);
  }

  // 验证密码强度（至少8个字符）
  if (password.length < 8) {
    return c.json({ ok: false, error: "密码至少需要8个字符" }, 400);
  }

  // 验证学号格式（假设学号为数字且至少4位）
  if (!/^\d{4,}$/.test(studentId)) {
    return c.json({ ok: false, error: "学号格式无效" }, 400);
  }

  // 验证姓名（不能为空且长度限制）
  if (name.trim().length < 2 || name.length > 50) {
    return c.json({ ok: false, error: "姓名长度应在2-50个字符之间" }, 400);
  }

  const db = getDb();

  // 检查邮箱和学号是否已存在
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return c.json({ ok: false, error: "邮箱已被注册" }, 400);
  }

  const existingStudentId = await db
    .select()
    .from(users)
    .where(eq(users.studentId, studentId))
    .limit(1);

  if (existingStudentId.length > 0) {
    return c.json({ ok: false, error: "学号已被注册" }, 400);
  }

  // 哈希密码
  const hashedPassword = await hashPassword(password);

  // 创建用户
  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      password: hashedPassword,
      studentId,
      phone: phone || null,
      role: "student",
    })
    .returning();

  // 生成 token
  const token = await generateToken({
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  return c.json(
    {
      ok: true,
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          studentId: newUser.studentId,
          phone: newUser.phone,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      },
    },
    201,
  );
});

// 用户登录
app.post("/auth/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as LoginRequest;
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ ok: false, error: "缺少邮箱或密码" }, 400);
  }

  const db = getDb();

  // 查找用户
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return c.json({ ok: false, error: "邮箱或密码错误" }, 401);
  }

  // 验证密码
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return c.json({ ok: false, error: "邮箱或密码错误" }, 401);
  }

  // 检查账号是否被禁用
  if (!user.isActive) {
    return c.json({ ok: false, error: "账号已被禁用" }, 403);
  }

  // 生成 token
  const token = await generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return c.json({
    ok: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    },
  });
});

// 忘记密码（演示版：统一成功响应，避免邮箱枚举）
app.post("/auth/forgot-password", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email || "").trim();

  if (!email || !isValidEmail(email)) {
    return c.json({ ok: false, error: "请输入有效的邮箱地址" }, 400);
  }

  const db = getDb();
  const [targetUser] = await db
    .select({
      id: users.id,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // 演示环境提供可直接访问的重置链接，避免“无法完成找回”断点。
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || new URL(c.req.url).origin;
  const resetToken = await generatePasswordResetToken(
    targetUser?.isActive ? targetUser.id : 0,
  );
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const responseData =
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          resetUrl,
          demo: true,
        };

  // 出于安全考虑，无论邮箱是否存在都返回统一成功信息。
  return c.json({
    ok: true,
    message: "若该邮箱已注册，重置指引将发送到邮箱（演示环境可直接使用页面重置）",
    data: responseData,
  });
});

// 重置密码
app.post("/auth/reset-password", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    token?: string;
    newPassword?: string;
  };
  const token = (body.token || "").trim();
  const newPassword = (body.newPassword || "").trim();

  if (!token || !newPassword) {
    return c.json({ ok: false, error: "缺少重置凭据或新密码" }, 400);
  }

  if (newPassword.length < 8) {
    return c.json({ ok: false, error: "新密码至少需要8个字符" }, 400);
  }

  const payload = await verifyPasswordResetToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "重置链接无效或已过期" }, 400);
  }

  const db = getDb();
  const [targetUser] = await db
    .select({
      id: users.id,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!targetUser || !targetUser.isActive) {
    return c.json({ ok: false, error: "重置链接无效或已过期" }, 400);
  }

  const hashedPassword = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, targetUser.id));

  return c.json({ ok: true, message: "密码重置成功，请使用新密码登录" });
});

// 获取当前用户信息
app.get("/auth/me", authMiddleware, async (c) => {
  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, currentUser.userId)).limit(1);

  if (!user) {
    return c.json({ ok: false, error: "用户不存在" }, 404);
  }

  return c.json({
    ok: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
});

// ============================================
// 用户个人资料路由
// ============================================

// 获取当前用户信息
app.get("/users/me", authMiddleware, async (c) => {
  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      studentId: users.studentId,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, currentUser.userId))
    .limit(1);

  if (!user) {
    return c.json({ ok: false, error: "用户不存在" }, 404);
  }

  return c.json({ ok: true, data: user });
});

// 更新当前用户信息
app.patch("/users/me", authMiddleware, async (c) => {
  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const { name, phone, currentPassword, newPassword } = body;

  const db = getDb();

  // 如果要修改密码，需要验证当前密码
  if (newPassword) {
    if (!currentPassword) {
      return c.json({ ok: false, error: "请输入当前密码" }, 400);
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1);

    if (!user) {
      return c.json({ ok: false, error: "用户不存在" }, 404);
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return c.json({ ok: false, error: "当前密码错误" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ ok: false, error: "新密码至少6个字符" }, 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, currentUser.userId));
  }

  // 更新其他信息
  const updates: Partial<typeof users.$inferInsert> = {};
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone || null;

  if (Object.keys(updates).length > 0) {
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, currentUser.userId));
  }

  return c.json({ ok: true, message: "更新成功" });
});

// ============================================
// 区域管理路由
// ============================================

// 获取所有区域
app.get("/zones", async (c) => {
  const db = getDb();
  const allZones = await db.select().from(zones).orderBy(zones.floor, zones.name);
  return c.json({ ok: true, data: allZones });
});

// 获取单个区域
app.get("/zones/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const db = getDb();
  const [zone] = await db.select().from(zones).where(eq(zones.id, id)).limit(1);

  if (!zone) {
    return c.json({ ok: false, error: "区域不存在" }, 404);
  }

  return c.json({ ok: true, data: zone });
});

// 创建区域（需要管理员权限）
app.post("/zones", authMiddleware, adminMiddleware, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as CreateZoneRequest;
  const { name, floor, description } = body;

  if (!name || typeof floor !== "number") {
    return c.json({ ok: false, error: "缺少必填字段" }, 400);
  }

  const db = getDb();
  const [zone] = await db
    .insert(zones)
    .values({
      name,
      floor,
      description: description || null,
    })
    .returning();

  return c.json({ ok: true, data: zone }, 201);
});

// 更新区域（需要管理员权限）
app.put("/zones/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as UpdateZoneRequest;
  const { name, floor, description, isActive } = body;

  const updates: Partial<typeof zones.$inferInsert> = {};
  if (name) updates.name = name;
  if (typeof floor === "number") updates.floor = floor;
  if (description !== undefined) updates.description = description;
  if (typeof isActive === "boolean") updates.isActive = isActive;

  if (Object.keys(updates).length === 0) {
    return c.json({ ok: false, error: "没有要更新的字段" }, 400);
  }

  const db = getDb();
  const [zone] = await db.update(zones).set(updates).where(eq(zones.id, id)).returning();

  if (!zone) {
    return c.json({ ok: false, error: "区域不存在" }, 404);
  }

  return c.json({ ok: true, data: zone });
});

// 删除区域（需要管理员权限）
app.delete("/zones/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const db = getDb();

  // 检查该区域是否有座位
  const seatsInZone = await db
    .select({ count: count() })
    .from(seats)
    .where(eq(seats.zoneId, id));

  if (seatsInZone[0] && Number(seatsInZone[0].count) > 0) {
    return c.json(
      { ok: false, error: "该区域下还有座位，无法删除。请先删除所有座位。" },
      400
    );
  }

  const [result] = await db.delete(zones).where(eq(zones.id, id)).returning({ id: zones.id });

  if (!result) {
    return c.json({ ok: false, error: "区域不存在" }, 404);
  }

  return c.json({ ok: true, data: { id: result.id } });
});

// 更新区域布局和座位（编辑器保存专用）
app.post("/zones/:id/layout", authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const body = await c.req.json() as { layoutObjects?: unknown; seats?: unknown };
  const layoutObjects = body.layoutObjects;
  const inputSeats = body.seats;

  if (!Array.isArray(layoutObjects) || !Array.isArray(inputSeats)) {
    return c.json({ ok: false, error: "数据格式错误" }, 400);
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      // 1. 更新区域的 layoutObjects
      await tx
        .update(zones)
        .set({ layoutObjects: JSON.stringify(layoutObjects) })
        .where(eq(zones.id, id));

      // 2. 先获取该区域下所有现有座位ID
      const existingSeats = await tx.select({ id: seats.id }).from(seats).where(eq(seats.zoneId, id));
      const existingIds = new Set(existingSeats.map(s => s.id));

      // 3. 智能同步座位数据
  const updates: Array<{ id: number; data: SeatInsert }> = [];
  const inserts: SeatInsert[] = [];
  const processedIds: number[] = [];

  const seatInputs = inputSeats as SeatLayoutInput[];

  for (const s of seatInputs) {
        let realId: number | null = null;

        // 解析座位ID
        if (typeof s.id === 'number') {
          realId = s.id;
        } else if (typeof s.id === 'string') {
          if (/^\d+$/.test(s.id)) {
            // 纯数字字符串
            realId = parseInt(s.id);
          } else if (s.id.startsWith('seat-')) {
            // seat- 前缀格式
            const suffix = s.id.replace('seat-', '');
            const parsed = parseInt(suffix);

            // 如果能解析为数字且在现有ID中，则是更新；否则是新增
            if (!isNaN(parsed) && existingIds.has(parsed)) {
              realId = parsed;
            }
          }
        }

        // 准备座位数据
        const seatData: SeatInsert = {
          seatNumber: s.seatNumber as string,
          zoneId: id,
          x: s.x as number,
          y: s.y as number,
          rotation: s.rotation || 0,
          seatType: (s.seatType || "standard") as SeatInsert["seatType"],
          facilities: JSON.stringify(s.facilities || {}),
          isAvailable: true
        };

        if (realId && existingIds.has(realId)) {
          // 更新现有座位
          updates.push({ id: realId, data: seatData });
          processedIds.push(realId);
        } else {
          // 插入新座位
          inserts.push(seatData);
        }
      }

      // 4. 执行更新
      for (const update of updates) {
        await tx.update(seats).set(update.data).where(eq(seats.id, update.id));
      }

      // 5. 执行插入
      if (inserts.length > 0) {
        await tx.insert(seats).values(inserts);
      }

      // 6. 处理被删除的座位
      const toDeleteIds = Array.from(existingIds).filter(eid => !processedIds.includes(eid));

      if (toDeleteIds.length > 0) {
        // 先尝试把它们移出可视区域并禁用
        await tx.update(seats)
          .set({ isAvailable: false, x: -9999, y: -9999 })
          .where(inArray(seats.id, toDeleteIds));

        // 然后尝试物理删除
        try {
          await tx.delete(seats).where(inArray(seats.id, toDeleteIds));
        } catch {
          console.log("部分座位因存在预约记录无法物理删除，已软删除");
        }
      }
    });

    clearSeatsListCache();
    return c.json({ ok: true, message: "布局保存成功" });
  } catch (e) {
    console.error("保存布局失败:", e);
    return c.json({ ok: false, error: "保存失败" }, 500);
  }
});

// ============================================
// 座位管理路由
// ============================================

// 系统配置常量
const MIN_AVAILABLE_MINUTES = 30; // 最小可用时长（分钟）
const BUFFER_MINUTES = 15; // 清理缓冲时间（分钟）
const CHECKIN_WINDOW_MINUTES = DEFAULT_CHECKIN_WINDOW_MINUTES;
const SEATS_CACHE_TTL_MS = Math.max(0, Number(process.env.SEATS_CACHE_TTL_MS || 3000));
const SEATS_CACHE_MAX_KEYS = Math.max(8, Number(process.env.SEATS_CACHE_MAX_KEYS || 32));
const PENDING_CLEANUP_INTERVAL_MS = Math.max(0, Number(process.env.PENDING_CLEANUP_INTERVAL_MS || 60_000));

function getSeatsCacheStore(): Map<string, SeatsCacheEntry> {
  const globalForSeatsCache = globalThis as GlobalWithSeatsCache;
  if (!globalForSeatsCache.__tech_stack_overview_seats_cache) {
    globalForSeatsCache.__tech_stack_overview_seats_cache = new Map();
  }
  return globalForSeatsCache.__tech_stack_overview_seats_cache;
}

function buildSeatsCacheKey(zoneId: number | null): string {
  return zoneId === null ? "all" : `zone:${zoneId}`;
}

function getCachedSeatsList(zoneId: number | null): SeatListItem[] | null {
  if (SEATS_CACHE_TTL_MS <= 0) return null;

  const store = getSeatsCacheStore();
  const key = buildSeatsCacheKey(zoneId);
  const cached = store.get(key);

  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedSeatsList(zoneId: number | null, data: SeatListItem[]) {
  if (SEATS_CACHE_TTL_MS <= 0) return;

  const store = getSeatsCacheStore();
  const key = buildSeatsCacheKey(zoneId);
  store.set(key, {
    data,
    expiresAt: Date.now() + SEATS_CACHE_TTL_MS,
  });

  while (store.size > SEATS_CACHE_MAX_KEYS) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

function clearSeatsListCache() {
  getSeatsCacheStore().clear();
}

function shouldRunPendingCleanup(currentTs: number): boolean {
  const globalState = globalThis as GlobalWithSeatsCache;
  const lastRunTs = globalState.__tech_stack_overview_pending_cleanup_at ?? 0;
  if (PENDING_CLEANUP_INTERVAL_MS <= 0) {
    globalState.__tech_stack_overview_pending_cleanup_at = currentTs;
    return true;
  }
  if (currentTs - lastRunTs < PENDING_CLEANUP_INTERVAL_MS) return false;
  globalState.__tech_stack_overview_pending_cleanup_at = currentTs;
  return true;
}

async function cleanupExpiredPendingReservations(db: ReturnType<typeof getDb>, currentTime: Date): Promise<number> {
  const expiredCutoff = getPendingReservationExpiryCutoff(currentTime, CHECKIN_WINDOW_MINUTES);
  const updated = await db
    .update(reservations)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(reservations.status, "pending"),
        lt(reservations.startTime, expiredCutoff)
      )
    )
    .returning({ id: reservations.id });

  return updated.length;
}

async function maybeCleanupExpiredPendingReservations(
  db: ReturnType<typeof getDb>,
  currentTime: Date,
): Promise<number> {
  if (!shouldRunPendingCleanup(currentTime.getTime())) return 0;
  const cancelledCount = await cleanupExpiredPendingReservations(db, currentTime);
  if (cancelledCount > 0) {
    clearSeatsListCache();
  }
  return cancelledCount;
}

// 辅助函数：计算座位显示状态
async function getSeatDisplayStatus(db: ReturnType<typeof getDb>, seatId: number, currentTime: Date) {
  // 1. 检查当前是否有活跃预约（occupied）
  const currentReservation = await db
    .select({
      id: reservations.id,
      endTime: reservations.endTime,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.seatId, seatId),
        sql`${reservations.status} IN ('active', 'pending')`,
        sql`${reservations.startTime} <= ${currentTime}`,
        sql`${reservations.endTime} > ${currentTime}`
      )
    )
    .limit(1);

  if (currentReservation.length > 0) {
    return {
      displayStatus: "occupied" as const,
      availableUntil: null,
      nextReservationAt: null,
      currentOccupant: {
        reservationId: currentReservation[0].id,
        endTime: currentReservation[0].endTime.toISOString(),
      },
      nextReservation: null,
      availableMinutes: null,
      message: "座位当前正在使用中",
    };
  }

  // 2. 查找未来24小时内的下一个预约
  const next24HoursTime = next24Hours(currentTime);
  const nextReservation = await db
    .select({
      startTime: reservations.startTime,
      endTime: reservations.endTime,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.seatId, seatId),
        sql`${reservations.status} IN ('active', 'pending')`,
        sql`${reservations.startTime} > ${currentTime}`,
        sql`${reservations.startTime} <= ${next24HoursTime}`
      )
    )
    .orderBy(reservations.startTime)
    .limit(1);

  if (nextReservation.length === 0) {
    // 完全空闲（free）
    return {
      displayStatus: "free" as const,
      availableUntil: null,
      nextReservationAt: null,
      currentOccupant: null,
      nextReservation: null,
      availableMinutes: null,
      message: "座位完全空闲，可随时使用",
    };
  }

  // 3. 计算距离下一个预约的时间
  const nextStart = toChineseTime(nextReservation[0].startTime);
  const minutesUntilNext = diffMinutes(nextStart, currentTime);
  const availableUntil = addMinutes(nextStart, -BUFFER_MINUTES);

  if (minutesUntilNext < MIN_AVAILABLE_MINUTES) {
    // 锁定中（locked）- 距离下一个预约不足60分钟
    return {
      displayStatus: "locked" as const,
      availableUntil: null,
      nextReservationAt: nextStart.toISOString(),
      currentOccupant: null,
      nextReservation: {
        startTime: nextReservation[0].startTime.toISOString(),
        endTime: nextReservation[0].endTime.toISOString(),
      },
      availableMinutes: 0,
      message: `座位即将被占用（${minutesUntilNext}分钟后），无法入座`,
    };
  }

  // 4. 限时空闲（limited）
  const usableMinutes = diffMinutes(availableUntil, currentTime);
  return {
    displayStatus: "limited" as const,
    availableUntil: availableUntil.toISOString(),
    nextReservationAt: nextStart.toISOString(),
    currentOccupant: null,
    nextReservation: {
      startTime: nextReservation[0].startTime.toISOString(),
      endTime: nextReservation[0].endTime.toISOString(),
    },
    availableMinutes: usableMinutes,
    message: `座位限时可用，需在 ${availableUntil.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" })} 前离开`,
  };
}

// 获取所有座位（包含增强的显示状态）- 优化版：避免N+1查询
app.get("/seats", async (c) => {
  const db = getDb();
  const currentTime = now();
  await maybeCleanupExpiredPendingReservations(db, currentTime);

  const zoneId = c.req.query("zoneId");
  let zoneIdNum: number | null = null;

  if (zoneId) {
    const parsed = Number(zoneId);
    if (Number.isInteger(parsed)) {
      zoneIdNum = parsed;
    }
  }

  const cachedSeats = getCachedSeatsList(zoneIdNum);
  if (cachedSeats) {
    return c.json({ ok: true, data: cachedSeats });
  }

  let query = db.select().from(seats).$dynamic();

  if (zoneIdNum !== null) {
    query = query.where(eq(seats.zoneId, zoneIdNum));
  }

  const allSeats = await query;
  const next24HoursTime = next24Hours(currentTime);

  // 批量获取所有座位的预约信息（避免N+1查询）
  const seatIds = allSeats.map(s => s.id);
  const allReservations = seatIds.length > 0 ? await db
    .select({
      seatId: reservations.seatId,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
    })
    .from(reservations)
    .where(
      and(
        inArray(reservations.seatId, seatIds),
        sql`${reservations.status} IN ('active', 'pending')`,
        sql`${reservations.endTime} > ${currentTime}`
      )
    )
    .orderBy(reservations.startTime) : [];

  // 按座位ID分组预约
  const reservationsBySeat = new Map<number, typeof allReservations>();
  for (const res of allReservations) {
    if (!reservationsBySeat.has(res.seatId)) {
      reservationsBySeat.set(res.seatId, []);
    }
    reservationsBySeat.get(res.seatId)!.push(res);
  }

  // 计算每个座位的状态（在内存中处理，无需额外查询）
  const seatsWithStatus = allSeats.map((seat) => {
    // 如果座位本身不可用，直接返回 locked
    if (!seat.isAvailable) {
      return {
        ...seat,
        isAvailable: false,
        displayStatus: "locked" as const,
        availableUntil: null,
        nextReservationAt: null,
      };
    }

    const seatReservations = reservationsBySeat.get(seat.id) || [];

    // 找到当前正在进行的预约
    const currentReservation = seatReservations.find(r => {
      const rStart = toChineseTime(r.startTime);
      const rEnd = toChineseTime(r.endTime);
      return !isAfter(rStart, currentTime) && isAfter(rEnd, currentTime);
    });

    if (currentReservation) {
      return {
        ...seat,
        isAvailable: false,
        displayStatus: "occupied" as const,
        availableUntil: null,
        nextReservationAt: null,
      };
    }

    // 找到未来24小时内的下一个预约
    const nextReservation = seatReservations.find(r => {
      const rStart = toChineseTime(r.startTime);
      return isAfter(rStart, currentTime) && !isAfter(rStart, next24HoursTime);
    });

    if (!nextReservation) {
      // 完全空闲
      return {
        ...seat,
        isAvailable: true,
        displayStatus: "free" as const,
        availableUntil: null,
        nextReservationAt: null,
      };
    }

    const nextStart = toChineseTime(nextReservation.startTime);
    const minutesUntilNext = diffMinutes(nextStart, currentTime);

    if (minutesUntilNext < MIN_AVAILABLE_MINUTES) {
      // 锁定中
      return {
        ...seat,
        isAvailable: false,
        displayStatus: "locked" as const,
        availableUntil: null,
        nextReservationAt: nextStart.toISOString(),
      };
    }

    // 限时空闲
    const availableUntil = addMinutes(nextStart, -BUFFER_MINUTES);
    return {
      ...seat,
      isAvailable: true,
      displayStatus: "limited" as const,
      availableUntil: availableUntil.toISOString(),
      nextReservationAt: nextStart.toISOString(),
    };
  });

  setCachedSeatsList(zoneIdNum, seatsWithStatus);
  return c.json({ ok: true, data: seatsWithStatus });
});

// 获取单个座位
app.get("/seats/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const db = getDb();
  const [seat] = await db.select().from(seats).where(eq(seats.id, id)).limit(1);

  if (!seat) {
    return c.json({ ok: false, error: "座位不存在" }, 404);
  }

  return c.json({ ok: true, data: seat });
});

// 获取座位可用性详情
app.get("/seats/:id/availability", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const db = getDb();
  const currentTime = now();
  await maybeCleanupExpiredPendingReservations(db, currentTime);

  const [seat] = await db.select().from(seats).where(eq(seats.id, id)).limit(1);

  if (!seat) {
    return c.json({ ok: false, error: "座位不存在" }, 404);
  }

  // 如果座位本身不可用
  if (!seat.isAvailable) {
    return c.json({
      ok: true,
      data: {
        seatId: id,
        status: "locked",
        availableMinutes: null,
        nextReservation: null,
        currentOccupant: null,
        message: "座位已被管理员禁用",
      },
    });
  }

  const statusInfo = await getSeatDisplayStatus(db, id, currentTime);

  return c.json({
    ok: true,
    data: {
      seatId: id,
      status: statusInfo.displayStatus,
      availableMinutes: statusInfo.availableMinutes,
      nextReservation: statusInfo.nextReservation,
      currentOccupant: statusInfo.currentOccupant,
      message: statusInfo.message,
    },
  });
})

// 创建座位（需要管理员权限）
app.post("/seats", authMiddleware, adminMiddleware, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as CreateSeatRequest;
  const { seatNumber, zoneId, x, y } = body;

  if (!seatNumber || !zoneId) {
    return c.json({ ok: false, error: "缺少必填字段" }, 400);
  }

  const db = getDb();
  const [seat] = await db
    .insert(seats)
    .values({
      seatNumber,
      zoneId,
      x: x || 0,
      y: y || 0,
    })
    .returning();

  clearSeatsListCache();
  return c.json({ ok: true, data: seat }, 201);
});

// 更新座位（需要管理员权限）
app.put("/seats/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as UpdateSeatRequest;
  const { seatNumber, zoneId, isAvailable, x, y } = body;

  const updates: Partial<typeof seats.$inferInsert> = {};
  if (seatNumber) updates.seatNumber = seatNumber;
  if (zoneId) updates.zoneId = zoneId;
  if (typeof isAvailable === "boolean") updates.isAvailable = isAvailable;
  if (typeof x === "number") updates.x = x;
  if (typeof y === "number") updates.y = y;

  if (Object.keys(updates).length === 0) {
    return c.json({ ok: false, error: "没有要更新的字段" }, 400);
  }

  const db = getDb();
  const [seat] = await db.update(seats).set(updates).where(eq(seats.id, id)).returning();

  if (!seat) {
    return c.json({ ok: false, error: "座位不存在" }, 404);
  }

  clearSeatsListCache();
  return c.json({ ok: true, data: seat });
});

// 获取指定座位在指定日期的预约列表（用于前端时间轴展示）
app.get("/seats/:id/reservations", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  const dateStr = c.req.query("date"); // YYYY-MM-DD

  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();
  await maybeCleanupExpiredPendingReservations(db, now());

  // 默认为今天（UTC+8）
  const date = dateStr ? parseDate(dateStr) : now();
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const seatReservations = await db
    .select({
      id: reservations.id,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      status: reservations.status,
      userId: reservations.userId
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.seatId, id),
        sql`${reservations.status} IN ('active', 'pending')`,
        sql`${reservations.endTime} >= ${dayStart}`,
        sql`${reservations.startTime} <= ${dayEnd}`
      )
    )
    .orderBy(reservations.startTime);

  const sanitized = seatReservations.map((r) => ({
    id: r.id,
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
    isMine: r.userId === currentUser.userId,
  }));

  return c.json({ ok: true, data: sanitized });
});

// 删除座位（需要管理员权限）
app.delete("/seats/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const db = getDb();

  // 检查该座位是否有预约记录
  const reservationsForSeat = await db
    .select({ count: count() })
    .from(reservations)
    .where(eq(reservations.seatId, id));

  if (reservationsForSeat[0] && Number(reservationsForSeat[0].count) > 0) {
    return c.json(
      { ok: false, error: "该座位有预约记录，无法删除。请先删除所有预约记录。" },
      400
    );
  }

  const [result] = await db.delete(seats).where(eq(seats.id, id)).returning({ id: seats.id });

  if (!result) {
    return c.json({ ok: false, error: "座位不存在" }, 404);
  }

  clearSeatsListCache();
  return c.json({ ok: true, data: { id: result.id } });
});

// ============================================
// 预约管理路由
// ============================================

// 获取所有预约（包含座位和区域信息）- 支持分页
app.get("/reservations", authMiddleware, async (c) => {
  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();
  await maybeCleanupExpiredPendingReservations(db, now());

  // 分页参数
  const limit = Number(c.req.query("limit") || 0);
  const page = Math.max(1, Number(c.req.query("page") || 1));
  const pageSize = limit > 0 ? limit : Number(c.req.query("pageSize") || 50);
  // 限制pageSize范围
  const validPageSize = Math.min(Math.max(pageSize, 1), 100);
  const offset = (page - 1) * validPageSize;

  const whereClause = currentUser.role === "admin"
    ? undefined
    : eq(reservations.userId, currentUser.userId);

  const [allReservations, totalCountRows] = await Promise.all([
    db.query.reservations.findMany({
      where: whereClause,
      orderBy: desc(reservations.createdAt),
      limit: validPageSize,
      offset: offset,
      with: {
        seat: {
          with: {
            zone: true
          }
        },
        user: {
          columns: {
            id: true,
            name: true,
            studentId: true,
            email: true
          }
        }
      }
    }),
    db
      .select({ count: count() })
      .from(reservations)
      .where(whereClause || sql`true`)
  ]);

  const total = Number(totalCountRows[0]?.count || 0);
  const totalPages = Math.ceil(total / validPageSize);

  return c.json({
    ok: true,
    data: allReservations,
    pagination: {
      page,
      pageSize: validPageSize,
      total,
      totalPages
    }
  });
});

// 获取单个预约
app.get("/reservations/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();
  await maybeCleanupExpiredPendingReservations(db, now());
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, id),
    with: {
      seat: {
        with: {
          zone: true
        }
      },
      user: {
        columns: {
          id: true,
          name: true,
          studentId: true
        }
      }
    }
  });

  if (!reservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  // 普通用户只能查看自己的预约
  if (currentUser.role !== "admin" && reservation.userId !== currentUser.userId) {
    return c.json({ ok: false, error: "无权访问" }, 403);
  }

  return c.json({ ok: true, data: reservation });
});

// 创建预约（支持即来即用和提前预约两种模式）
app.post("/reservations", authMiddleware, async (c) => {
  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const body = (await c.req.json().catch(() => ({}))) as CreateReservationRequest;
  const { seatId, reservationType: reqType, startTime: reqStartTime } = body;

  if (!seatId) {
    return c.json({ ok: false, error: "缺少必填字段" }, 400);
  }

  const db = getDb();
  const currentTime = now();
  await maybeCleanupExpiredPendingReservations(db, currentTime);

  // 检查用户当前活跃预约数量（最多3个）
  const activeReservationsCount = await db
    .select({ count: count() })
    .from(reservations)
    .where(
      and(
        eq(reservations.userId, currentUser.userId),
        sql`${reservations.status} IN ('active', 'pending')`
      )
    );

  if (activeReservationsCount[0] && Number(activeReservationsCount[0].count) >= 3) {
    return c.json({ ok: false, error: "您最多只能同时拥有3个活跃预约，请先取消或完成现有预约" }, 400);
  }

  // 检查座位是否存在且可用
  const [seat] = await db.select().from(seats).where(eq(seats.id, seatId)).limit(1);

  if (!seat) {
    return c.json({ ok: false, error: "座位不存在" }, 404);
  }

  if (!seat.isAvailable) {
    return c.json({ ok: false, error: "座位不可用" }, 400);
  }

  // 区域若处于维护状态，不允许创建新预约
  const [zone] = await db
    .select({ id: zones.id, isActive: zones.isActive })
    .from(zones)
    .where(eq(zones.id, seat.zoneId))
    .limit(1);

  if (!zone || !zone.isActive) {
    return c.json({ ok: false, error: "该区域当前维护中，暂不可预约" }, 400);
  }

  let reservationStart: Date;
  let reservationEnd: Date;
  let reservationType: "walk_in" | "advance" = "walk_in";

  // ========== 提前预约模式 ==========
  if (reqType === "advance") {
    reservationType = "advance";

    // 验证必填参数
    if (!reqStartTime) {
      return c.json({ ok: false, error: "提前预约需要指定签到时间" }, 400);
    }

    // 解析签到时间
    const parsedStartTime = toChineseTime(reqStartTime);

    // 验证：当前时间必须>=20:00才能预约次日
    const currentHour = toChineseTime(currentTime).getHours();
    if (currentHour < 20) {
      return c.json({ ok: false, error: "提前预约功能仅在晚上20:00后开放" }, 400);
    }

    // 验证：预约的开始时间必须是明天
    const tomorrowStart = startOfDay(addDays(currentTime, 1));
    const tomorrowEnd = endOfDay(addDays(currentTime, 1));

    if (isBefore(parsedStartTime, tomorrowStart) || isAfter(parsedStartTime, tomorrowEnd)) {
      return c.json({ ok: false, error: "提前预约只能预约明天的时段" }, 400);
    }

    reservationStart = parsedStartTime;
    reservationEnd = tomorrowEnd; // 持续到明天结束

  } else {
    // ========== 即来即用模式（Walk-in）==========
    reservationStart = currentTime;

    const statusInfo = await getSeatDisplayStatus(db, seatId, currentTime);

    if (statusInfo.displayStatus === "occupied") {
      return c.json({ ok: false, error: "座位当前正在使用中" }, 400);
    }

    if (statusInfo.displayStatus === "locked") {
      return c.json({ ok: false, error: statusInfo.message }, 400);
    }

    if (statusInfo.displayStatus === "free") {
      // 完全空闲：持续到当天结束（UTC+8时区）
      reservationEnd = endOfDay(currentTime);
    } else {
      // 限时空闲：结束时间为下一个预约开始前15分钟
      if (!statusInfo.availableUntil) {
        // 回退到当天结束
        reservationEnd = endOfDay(currentTime);
      } else {
        reservationEnd = toChineseTime(statusInfo.availableUntil);
      }
    }
  }

  // 使用事务确保并发安全：检查冲突和创建预约必须原子执行
  let reservation;
  try {
    reservation = await db.transaction(async (tx) => {
      // 在事务中检查冲突
      const conflictingReservations = await tx
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.seatId, seatId),
            sql`${reservations.status} IN ('active', 'pending')`,
            lt(reservations.startTime, reservationEnd),
            gt(reservations.endTime, reservationStart)
          )
        )
        .limit(1);

      if (conflictingReservations.length > 0) {
        throw new Error("该时段已被预约");
      }

      // 创建预约
      const [newReservation] = await tx
        .insert(reservations)
        .values({
          seatId,
          userId: currentUser.userId,
          startTime: reservationStart,
          endTime: reservationEnd,
          status: "pending",
          reservationType: reservationType,
        })
        .returning();

      return newReservation;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "该时段已被预约") {
      return c.json({ ok: false, error: error.message }, 400);
    }
    throw error;
  }

  clearSeatsListCache();

  // 返回包含额外信息的响应
  if (reservationType === "advance") {
    return c.json({
      ok: true,
      data: reservation,
      meta: {
        isAdvance: true,
        message: `提前预约成功，请于明天 ${reservationStart.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" })} 前往签到`,
      }
    }, 201);
  }

  // Walk-in 模式的响应
  const todayEnd = endOfDay(currentTime);
  const isLimited = isBefore(reservationEnd, todayEnd);

  return c.json({
    ok: true,
    data: reservation,
    meta: {
      isLimited,
      message: isLimited
        ? `座位限时可用，请在 ${reservationEnd.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 前离开`
        : "预约成功，请在15分钟内签到",
    }
  }, 201);
});

// 调整预约时间
app.patch("/reservations/:id/adjust", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const body = await c.req.json();
  const { startTime, endTime } = body;

  if (!startTime || !endTime) {
    return c.json({ ok: false, error: "必须指定新的开始和结束时间" }, 400);
  }

  const newStart = toChineseTime(startTime);
  const newEnd = toChineseTime(endTime);

  if (!isBefore(newStart, newEnd)) {
    return c.json({ ok: false, error: "结束时间必须晚于开始时间" }, 400);
  }

  const db = getDb();

  // 获取原预约
  const [existingReservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!existingReservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  if (currentUser.role !== "admin" && existingReservation.userId !== currentUser.userId) {
    return c.json({ ok: false, error: "无权操作" }, 403);
  }

  // 检查状态
  if (existingReservation.status !== "active" && existingReservation.status !== "pending") {
    return c.json({ ok: false, error: "只能调整进行中或待签到的预约" }, 400);
  }

  // 检查冲突 (排除自己)
  const conflicts = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.seatId, existingReservation.seatId),
        sql`${reservations.status} IN ('active', 'pending')`,
        // 排除自己
        sql`${reservations.id} != ${id}`,
        // 时间重叠
        lt(reservations.startTime, newEnd),
        gt(reservations.endTime, newStart)
      )
    )
    .limit(1);

  if (conflicts.length > 0) {
    return c.json({ ok: false, error: "调整后的时间与现有预约冲突" }, 400);
  }

  // 更新
  const [updated] = await db
    .update(reservations)
    .set({
      startTime: newStart,
      endTime: newEnd
    })
    .where(eq(reservations.id, id))
    .returning();

  clearSeatsListCache();
  return c.json({ ok: true, data: updated });
});

// 预约签到
app.post("/reservations/:id/checkin", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!reservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  if (reservation.userId !== currentUser.userId) {
    return c.json({ ok: false, error: "无权操作" }, 403);
  }

  if (reservation.status !== "pending") {
    return c.json({ ok: false, error: "该预约无需签到" }, 400);
  }

  // 检查是否在允许签到且未超时的时间窗口内（开始前15分钟 ~ 开始后15分钟）
  const currentTime = now();
  const startTime = toChineseTime(reservation.startTime);
  const minutesDiff = diffMinutes(currentTime, startTime);

  // minutesDiff < 0 means before start (current time is earlier)
  if (minutesDiff < -CHECKIN_WINDOW_MINUTES) {
    return c.json({ ok: false, error: "未到签到时间，请在开始前15分钟内签到" }, 400);
  }

  if (minutesDiff > CHECKIN_WINDOW_MINUTES) {
    // 超时自动取消
    await db.update(reservations).set({ status: "cancelled" }).where(eq(reservations.id, id));
    clearSeatsListCache();
    return c.json({ ok: false, error: "签到超时，预约已取消" }, 400);
  }

  // 更新状态为 active
  const [updated] = await db
    .update(reservations)
    .set({ status: "active" })
    .where(eq(reservations.id, id))
    .returning();

  clearSeatsListCache();
  return c.json({ ok: true, data: updated });
});

// 生成预约签到二维码
app.get("/reservations/:id/qrcode", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!reservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  if (reservation.userId !== currentUser.userId) {
    return c.json({ ok: false, error: "无权访问" }, 403);
  }

  // 生成签到链接 - 包含预约ID和用户ID作为验证
  const requestOrigin = new URL(c.req.url).origin;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || requestOrigin;
  const checkinUrl = `${baseUrl}/checkin?reservationId=${id}&userId=${currentUser.userId}`;

  try {
    // 生成二维码（Data URL格式）
    const qrCodeDataUrl = await QRCode.toDataURL(checkinUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    return c.json({
      ok: true,
      data: {
        qrCode: qrCodeDataUrl,
        checkinUrl: checkinUrl
      }
    });
  } catch (error) {
    console.error("生成二维码失败:", error);
    return c.json({ ok: false, error: "生成二维码失败" }, 500);
  }
});

// 结束使用（退座）
app.post("/reservations/:id/finish", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();
  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!reservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  if (reservation.userId !== currentUser.userId) {
    return c.json({ ok: false, error: "无权操作" }, 403);
  }

  if (reservation.status !== "active" && reservation.status !== "pending") {
    return c.json({ ok: false, error: "当前状态无法退座" }, 400);
  }

  const currentTime = now();
  const startTime = toChineseTime(reservation.startTime);

  // 如果还没开始就点击结束（说明是早于开始时间签到了）
  // 此时作为取消处理，避免 endTime < startTime
  if (isBefore(currentTime, startTime)) {
    const [updated] = await db
      .update(reservations)
      .set({ status: "cancelled" })
      .where(eq(reservations.id, id))
      .returning();
    clearSeatsListCache();
    return c.json({ ok: true, data: updated, message: "因提前结束，订单已由系统自动取消" });
  }

  // 结束预约
  const [updated] = await db
    .update(reservations)
    .set({
      status: "completed",
      endTime: currentTime // 更新结束时间为当前时间（UTC+8）
    })
    .where(eq(reservations.id, id))
    .returning();

  clearSeatsListCache();
  return c.json({ ok: true, data: updated });
});

// 更新预约状态（仅管理员）
app.put("/reservations/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as UpdateReservationRequest;
  const { status } = body;

  if (!status) {
    return c.json({ ok: false, error: "缺少状态字段" }, 400);
  }

  if (!["pending", "active", "completed", "cancelled"].includes(status)) {
    return c.json({ ok: false, error: "无效的状态字段" }, 400);
  }

  const db = getDb();

  // 查找预约
  const [existingReservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!existingReservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  // 更新预约状态
  const [reservation] = await db
    .update(reservations)
    .set({ status })
    .where(eq(reservations.id, id))
    .returning();

  clearSeatsListCache();
  return c.json({ ok: true, data: reservation });
});

// 取消预约（软删除：设置为cancelled）
app.patch("/reservations/:id/cancel", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();

  // 查找预约
  const [existingReservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!existingReservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  // 普通用户只能取消自己的预约
  if (currentUser.role !== "admin" && existingReservation.userId !== currentUser.userId) {
    return c.json({ ok: false, error: "无权取消" }, 403);
  }

  // 只能取消 active 或 pending 状态的预约
  if (existingReservation.status !== "active" && existingReservation.status !== "pending") {
    return c.json({ ok: false, error: "只能取消进行中或待签到的预约" }, 400);
  }

  // 软删除：将状态设置为 cancelled
  const [reservation] = await db
    .update(reservations)
    .set({ status: "cancelled" })
    .where(eq(reservations.id, id))
    .returning();

  clearSeatsListCache();
  return c.json({ ok: true, data: reservation });
});

// 删除预约记录（真删除）
app.delete("/reservations/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const currentUser = getCurrentUser(c);
  if (!currentUser) {
    return c.json({ ok: false, error: "未认证" }, 401);
  }

  const db = getDb();

  // 查找预约
  const [existingReservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!existingReservation) {
    return c.json({ ok: false, error: "预约不存在" }, 404);
  }

  // 普通用户只能删除自己的预约
  if (currentUser.role !== "admin" && existingReservation.userId !== currentUser.userId) {
    return c.json({ ok: false, error: "无权删除" }, 403);
  }

  // 只能删除已取消或已完成的预约
  if (existingReservation.status === "active") {
    return c.json({ ok: false, error: "请先取消预约，再删除记录" }, 400);
  }

  // 真删除
  const [result] = await db
    .delete(reservations)
    .where(eq(reservations.id, id))
    .returning({ id: reservations.id });

  clearSeatsListCache();
  return c.json({ ok: true, data: result });
});

// ============================================
// 用户管理路由（管理员）
// ============================================

// 获取所有用户（管理员）
app.get("/users", authMiddleware, adminMiddleware, async (c) => {
  const db = getDb();
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    studentId: users.studentId,
    phone: users.phone,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt));

  return c.json({ ok: true, data: allUsers });
});

// 更新用户状态（管理员）
app.put("/users/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ ok: false, error: "无效的 ID" }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as { isActive?: boolean };
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return c.json({ ok: false, error: "缺少有效字段" }, 400);
  }

  const db = getDb();

  // 查找用户以检查是否为管理员
  const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!existingUser) {
    return c.json({ ok: false, error: "用户不存在" }, 404);
  }

  // 不允许禁用管理员账号
  if (existingUser.role === "admin" && isActive === false) {
    return c.json({ ok: false, error: "不能禁用管理员账号" }, 400);
  }

  const [user] = await db
    .update(users)
    .set({ isActive })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      studentId: users.studentId,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

  return c.json({ ok: true, data: user });
});

// ============================================
// 统计接口
// ============================================

// 获取系统统计数据
app.get("/stats", authMiddleware, adminMiddleware, async (c) => {
  const db = getDb();

  // 今日预约数（UTC+8）
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [zoneCountRows, seatCountRows, userCountRows, todayReservationsRows] = await Promise.all([
    db.select({ count: count() }).from(zones),
    db.select({ count: count() }).from(seats),
    db.select({ count: count() }).from(users),
    db
      .select({ count: count() })
      .from(reservations)
      .where(
        and(
          sql`${reservations.createdAt} >= ${todayStart}`,
          sql`${reservations.createdAt} <= ${todayEnd}`
        )
      ),
  ]);

  return c.json({
    ok: true,
    data: {
      zones: Number(zoneCountRows[0]?.count) || 0,
      seats: Number(seatCountRows[0]?.count) || 0,
      users: Number(userCountRows[0]?.count) || 0,
      todayReservations: Number(todayReservationsRows[0]?.count) || 0,
    },
  });
});

// 获取近7天预约趋势
app.get("/stats/weekly", authMiddleware, adminMiddleware, async (c) => {
  const db = getDb();
  const currentTime = now();

  const dayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const last7Days = await Promise.all(
    Array.from({ length: 7 }).map(async (_, idx) => {
      const day = addDays(currentTime, -(6 - idx));
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const [countRow] = await db
        .select({ count: count() })
        .from(reservations)
        .where(
          and(
            sql`${reservations.createdAt} >= ${dayStart}`,
            sql`${reservations.createdAt} <= ${dayEnd}`
          )
        );

      return {
        day: dayLabels[toChineseTime(day).getDay()],
        count: Number(countRow?.count || 0),
      };
    })
  );

  return c.json({ ok: true, data: last7Days });
});

// ============================================
// 排行榜接口
// ============================================

// 获取学习时长排行榜
app.get("/leaderboard", async (c) => {
  const period = (c.req.query("period") || "week") as "today" | "week" | "month" | "all";
  const limit = Math.min(Number(c.req.query("limit")) || 20, 100);

  const db = getDb();
  const currentTime = now();

  // 计算时间范围
  let periodStart: Date;
  let periodEnd: Date = endOfDay(currentTime);

  switch (period) {
    case "today":
      periodStart = startOfDay(currentTime);
      break;
    case "week":
      // 本周一开始
      const dayOfWeek = currentTime.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = startOfDay(addDays(currentTime, -daysToMonday));
      break;
    case "month":
      // 本月第一天
      periodStart = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "all":
    default:
      // 全部时间
      periodStart = new Date(2020, 0, 1);
      periodEnd = new Date(2100, 0, 1);
      break;
  }

  // 查询已完成预约并计算学习时长（排除管理员用户）
  const rankings = await db
    .select({
      userId: reservations.userId,
      name: users.name,
      studentId: users.studentId,
      totalMinutes: sql<number>`SUM(EXTRACT(EPOCH FROM (${reservations.endTime} - ${reservations.startTime})) / 60)`.as("total_minutes"),
      reservationCount: sql<number>`COUNT(*)`.as("reservation_count"),
    })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(
      and(
        eq(reservations.status, "completed"),
        eq(users.role, "student"), // 只统计学生用户
        sql`${reservations.startTime} >= ${periodStart}`,
        sql`${reservations.endTime} <= ${periodEnd}`
      )
    )
    .groupBy(reservations.userId, users.name, users.studentId)
    .orderBy(sql`total_minutes DESC`)
    .limit(limit);

  // 添加排名
  const rankingsWithRank = rankings.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    name: entry.name,
    studentId: entry.studentId.substring(0, 4) + "****", // 隐私处理
    totalMinutes: Math.round(Number(entry.totalMinutes) || 0),
    reservationCount: Number(entry.reservationCount) || 0,
  }));

  // 尝试获取当前用户排名
  let myRank = null;
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);
      if (payload?.userId) {
        // 直接从排行榜中查找当前用户
        const myRankInList = rankingsWithRank.find(r => r.userId === payload.userId);

        if (myRankInList) {
          // 用户在排行榜中
          myRank = myRankInList;
        } else {
          // 用户不在排行榜中，单独查询
          const [myStats] = await db
            .select({
              totalMinutes: sql<number>`SUM(EXTRACT(EPOCH FROM (${reservations.endTime} - ${reservations.startTime})) / 60)`.as("total_minutes"),
              reservationCount: sql<number>`COUNT(*)`.as("reservation_count"),
            })
            .from(reservations)
            .where(
              and(
                eq(reservations.userId, payload.userId),
                eq(reservations.status, "completed"),
                sql`${reservations.startTime} >= ${periodStart}`,
                sql`${reservations.endTime} <= ${periodEnd}`
              )
            );

          if (myStats && myStats.totalMinutes) {
            const myTotalMinutes = Math.round(Number(myStats.totalMinutes) || 0);

            // 计算比当前用户强的人数
            const betterUsers = rankingsWithRank.filter(r => r.totalMinutes > myTotalMinutes);

            // 获取用户信息
            const [currentUser] = await db
              .select({ name: users.name, studentId: users.studentId })
              .from(users)
              .where(eq(users.id, payload.userId));

            if (currentUser) {
              myRank = {
                rank: betterUsers.length + 1,
                userId: payload.userId,
                name: currentUser.name,
                studentId: currentUser.studentId.substring(0, 4) + "****",
                totalMinutes: myTotalMinutes,
                reservationCount: Number(myStats.reservationCount) || 0,
              };
            }
          }
        }
      }
    } catch {
      // 忽略认证错误，只是不返回 myRank
    }
  }

  return c.json({
    ok: true,
    data: {
      rankings: rankingsWithRank,
      myRank,
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
  });
});


export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
