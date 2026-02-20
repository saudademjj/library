/**
 * API 响应类型定义
 */

// 标准 API 响应格式
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页响应
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 用户相关类型
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  studentId: string;
  phone: string | null;
  role: "admin" | "student";
  isActive: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  studentId: string;
  phone?: string;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

// 区域边界框类型
export interface BoundingBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// 布局对象类型
export interface LayoutObject {
  id: string;
  type: "table" | "wall" | "window" | "door" | "plant" | "pillar";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
}

// 区域相关类型
export interface ZoneResponse {
  id: number;
  name: string;
  floor: number;
  description: string | null;
  isActive: boolean;
  layoutObjects?: string; // JSON string of LayoutObject[]
}

export interface CreateZoneRequest {
  name: string;
  floor: number;
  description?: string;
  layoutObjects?: string;
}

export interface UpdateZoneRequest {
  name?: string;
  floor?: number;
  description?: string;
  isActive?: boolean;
}

// 设施信息类型
export interface SeatFacilities {
  hasSocket: boolean;          // 插座
  hasLamp: boolean;            // 台灯
  hasComputer: boolean;        // 电脑
  hasWindow: boolean;          // 靠窗
  isQuietZone: boolean;        // 静音区
  socketCount?: number;        // 插座数量
  specialEquipment?: string[]; // 特殊设备
}

// 座位类型枚举
export type SeatType = "standard" | "study_room" | "computer_desk" | "reading_table";

// 座位相关类型
export interface SeatResponse {
  id: number;
  seatNumber: string;
  zoneId: number;
  isAvailable: boolean;
  x: number;
  y: number;
  zone?: ZoneResponse;
  // 座位类型
  seatType?: SeatType;
  // 设施信息
  facilities?: string; // JSON字符串
  // 备注
  note?: string;
}

export interface CreateSeatRequest {
  seatNumber: string;
  zoneId: number;
  x?: number;
  y?: number;
}

export interface UpdateSeatRequest {
  seatNumber?: string;
  zoneId?: number;
  isAvailable?: boolean;
  x?: number;
  y?: number;
}

// 预约相关类型
export interface ReservationResponse {
  id: number;
  seatId: number;
  userId: number;
  startTime: string;
  endTime: string;
  status: "pending" | "active" | "completed" | "cancelled";
  createdAt: string;
  seat?: SeatResponse;
  user?: UserResponse;
}

export interface CreateReservationRequest {
  seatId: number;
  reservationType?: "walk_in" | "advance";
  startTime?: string; // ISO 8601 格式，提前预约时必填
  endTime?: string;   // ISO 8601 格式，提前预约时必填
}

export interface UpdateReservationRequest {
  status?: "pending" | "active" | "completed" | "cancelled";
}

// 座位显示状态
export type SeatDisplayStatus = "free" | "limited" | "occupied" | "locked";

// 座位可用性响应
export interface SeatAvailabilityResponse {
  seatId: number;
  status: SeatDisplayStatus;
  availableMinutes: number | null;
  nextReservation: {
    startTime: string;
    endTime: string;
  } | null;
  currentOccupant: {
    reservationId: number;
    endTime: string;
  } | null;
  message: string;
}

// 扩展座位响应（包含显示状态）
export interface EnhancedSeatResponse extends SeatResponse {
  displayStatus: SeatDisplayStatus;
  availableUntil: string | null;
  nextReservationAt: string | null;
}

// 排行榜条目
export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  studentId: string;
  totalMinutes: number;
  reservationCount: number;
}

// 排行榜响应
export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all';

export interface LeaderboardResponse {
  rankings: LeaderboardEntry[];
  myRank: LeaderboardEntry | null;
  period: LeaderboardPeriod;
  periodStart: string;
  periodEnd: string;
}
