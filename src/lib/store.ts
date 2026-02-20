import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserResponse, ReservationResponse, SeatResponse, ZoneResponse, LeaderboardEntry } from './types';

type UserStats = Pick<LeaderboardEntry, "totalMinutes" | "reservationCount" | "rank">;

interface CacheState {
  // Data
  user: UserResponse | null;
  reservations: ReservationResponse[];
  zones: ZoneResponse[];
  seats: Record<number, SeatResponse[]>; // zoneId -> seats
  userStats: UserStats | null;

  // Timestamps
  lastUserFetch: number;
  lastReservationsFetch: number;
  lastZonesFetch: number;
  lastSeatsFetch: Record<number, number>;
  lastStatsFetch: number;

  // Actions
  setUser: (user: UserResponse | null) => void;
  setReservations: (reservations: ReservationResponse[]) => void;
  invalidateReservations: () => void;
  setZones: (zones: ZoneResponse[]) => void;
  setSeats: (zoneId: number, seats: SeatResponse[]) => void;
  setUserStats: (stats: UserStats | null) => void;
  
  // Helpers
  isFresh: (timestamp: number, ttl?: number) => boolean;
}

const CACHE_TTL = 60 * 1000; // 1 minute default TTL

export const useStore = create<CacheState>()(
  persist(
    (set) => ({
      user: null,
      reservations: [],
      zones: [],
      seats: {},
      userStats: null,

      lastUserFetch: 0,
      lastReservationsFetch: 0,
      lastZonesFetch: 0,
      lastSeatsFetch: {},
      lastStatsFetch: 0,

      setUser: (user) => set({ user, lastUserFetch: Date.now() }),
      setReservations: (reservations) => set({ reservations, lastReservationsFetch: Date.now() }),
      invalidateReservations: () => set({ lastReservationsFetch: 0 }),
      setZones: (zones) => set({ zones, lastZonesFetch: Date.now() }),
      setSeats: (zoneId, seats) => set((state) => ({
        seats: { ...state.seats, [zoneId]: seats },
        lastSeatsFetch: { ...state.lastSeatsFetch, [zoneId]: Date.now() }
      })),
      setUserStats: (stats) => set({ userStats: stats, lastStatsFetch: Date.now() }),

      isFresh: (timestamp, ttl = CACHE_TTL) => {
        return Date.now() - timestamp < ttl;
      }
    }),
    {
      name: 'library-storage',
      // 仅保留当前会话内缓存，避免刷新后出现“假登录/脏缓存”状态
      partialize: () => ({}),
      version: 2,
    }
  )
);
