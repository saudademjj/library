import { addMinutes } from "./datetime";

export const DEFAULT_CHECKIN_WINDOW_MINUTES = 15;

export function getPendingReservationExpiryCutoff(
  currentTime: Date,
  checkinWindowMinutes: number = DEFAULT_CHECKIN_WINDOW_MINUTES,
): Date {
  return addMinutes(currentTime, -checkinWindowMinutes);
}

export function isPendingReservationExpired(
  reservationStartTime: Date | string,
  currentTime: Date | string,
  checkinWindowMinutes: number = DEFAULT_CHECKIN_WINDOW_MINUTES,
): boolean {
  const start = new Date(reservationStartTime).getTime();
  const now = new Date(currentTime).getTime();
  return now - start > checkinWindowMinutes * 60_000;
}
