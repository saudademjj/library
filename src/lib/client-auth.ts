"use client";

import type { UserResponse } from "@/lib/types";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export const AUTH_STATE_EVENT = "auth-state-change";

function safeParseUser(raw: string | null): UserResponse | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UserResponse | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  return safeParseUser(localStorage.getItem(USER_KEY));
}

function emitAuthStateChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

export function setStoredAuth(token: string, user: UserResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthStateChanged();
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("library-storage");
  emitAuthStateChanged();
}
