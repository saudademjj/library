import { pgTable, serial, text, integer, boolean, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------
// 0. 定义枚举类型 (Enum) - 软著加分项：类型安全
// ---------------------------------------------------------
// 定义用户角色：admin=管理员, student=学生
export const roleEnum = pgEnum("role", ["admin", "student"]);

// 定义座位类型
export const seatTypeEnum = pgEnum("seat_type", ["standard", "study_room", "computer_desk", "reading_table"]);

// 定义预约状态
export const reservationStatusEnum = pgEnum("reservation_status", ["pending", "active", "completed", "cancelled"]);

// 定义预约类型
export const reservationTypeEnum = pgEnum("reservation_type", ["walk_in", "advance"]);

// ---------------------------------------------------------
// 1. 用户表 (Users) - 新增表
// ---------------------------------------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  // 基础信息
  name: text("name").notNull(), // 真实姓名
  email: text("email").notNull().unique(), // 邮箱，设为唯一
  password: text("password").notNull(), // 存储加密后的密码哈希值

  // 图书馆系统特有字段
  studentId: text("student_id").notNull().unique(), // 学号，必须唯一
  phone: text("phone"), // 联系电话（用于接收预约通知）

  // 权限控制
  role: roleEnum("role").default("student").notNull(),

  // 账号状态
  isActive: boolean("is_active").default(true), // 用于封禁违规用户

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------
// 2. 区域表 (Zones) - 扩展3D可视化字段
// ---------------------------------------------------------
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  floor: integer("floor").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),

  // 区域布局对象（JSON格式）：存储桌子、墙壁、门窗等
  // 格式示例: [{ type: "table", x: 100, y: 100, width: 200, height: 100 }, ...]
  layoutObjects: jsonb("layout_objects"),
}, (table) => [
  index("zones_floor_idx").on(table.floor),
  index("zones_is_active_idx").on(table.isActive),
]);

// ---------------------------------------------------------
// 3. 座位表 (Seats) - 扩展3D可视化字段
// ---------------------------------------------------------
export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  seatNumber: text("seat_number").notNull(),
  zoneId: integer("zone_id").references(() => zones.id).notNull(),
  isAvailable: boolean("is_available").default(true),

  // 2D坐标 (x, y) 和旋转角度
  x: integer("x").default(0).notNull(),
  y: integer("y").default(0).notNull(),
  rotation: integer("rotation").default(0),

  // 座位类型 - 使用 PostgreSQL enum 保证数据完整性
  seatType: seatTypeEnum("seat_type").default("standard"),

  // 设施信息（JSON格式）- 使用 jsonb 提升查询性能
  facilities: jsonb("facilities"),

  // 备注信息
  note: text("note"),
}, (table) => [
  index("seats_zone_id_idx").on(table.zoneId),
  index("seats_is_available_idx").on(table.isAvailable),
  index("seats_seat_type_idx").on(table.seatType),
]);

// ---------------------------------------------------------
// 4. 预约记录表 (Reservations) - 已关联用户表
// ---------------------------------------------------------
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),

  // 关联座位
  seatId: integer("seat_id")
    .references(() => seats.id)
    .notNull(),

  // 【重点修改】关联用户表
  // 之前是 readerName，现在是 userId 外键
  userId: integer("user_id")
    .references(() => users.id) // 指向 users 表的主键
    .notNull(),

  // 时间段
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),

  // 状态 - 使用 PostgreSQL enum 保证数据完整性
  status: reservationStatusEnum("status")
    .default("pending")
    .notNull(),

  // 预约类型 - 使用 PostgreSQL enum 保证数据完整性
  reservationType: reservationTypeEnum("reservation_type")
    .default("walk_in")
    .notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("reservations_seat_id_idx").on(table.seatId),
  index("reservations_user_id_idx").on(table.userId),
  index("reservations_status_idx").on(table.status),
  index("reservations_start_time_idx").on(table.startTime),
  index("reservations_end_time_idx").on(table.endTime),
]);

// ---------------------------------------------------------
// 5. 定义关系 (Relations) - 让数据互通
// ---------------------------------------------------------

// 用户关系定义
export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations), // 一个用户可以有多次预约
}));

// 预约关系定义
export const reservationsRelations = relations(reservations, ({ one }) => ({
  seat: one(seats, {
    fields: [reservations.seatId],
    references: [seats.id],
  }),
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
}));

// (Zone 和 Seat 的关系保持不变，略...)
export const zonesRelations = relations(zones, ({ many }) => ({
  seats: many(seats),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  zone: one(zones, {
    fields: [seats.zoneId],
    references: [zones.id],
  }),
  reservations: many(reservations),
}));