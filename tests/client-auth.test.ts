import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_STATE_EVENT,
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from "../src/lib/client-auth";
import type { UserResponse } from "../src/lib/types";

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const ORIGINAL_WINDOW = Object.getOwnPropertyDescriptor(globalThis, "window");
const ORIGINAL_LOCAL_STORAGE = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function restoreBrowserGlobals() {
  if (ORIGINAL_WINDOW) {
    Object.defineProperty(globalThis, "window", ORIGINAL_WINDOW);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }

  if (ORIGINAL_LOCAL_STORAGE) {
    Object.defineProperty(globalThis, "localStorage", ORIGINAL_LOCAL_STORAGE);
  } else {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
}

function installBrowserMocks() {
  const windowTarget = new EventTarget();
  const storage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: windowTarget,
  });

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: storage,
  });

  return { storage, windowTarget };
}

const USER: UserResponse = {
  id: 1,
  name: "图书馆用户",
  email: "reader@example.com",
  studentId: "2026001",
  phone: "13800138000",
  role: "student",
  isActive: true,
  createdAt: "2026-03-20T00:00:00.000Z",
};

test.afterEach(() => {
  restoreBrowserGlobals();
});

test("returns null auth state when browser storage is unavailable", () => {
  restoreBrowserGlobals();

  assert.equal(getStoredToken(), null);
  assert.equal(getStoredUser(), null);
});

test("stores auth state, reads it back, and emits auth change events", () => {
  const { windowTarget } = installBrowserMocks();
  let eventCount = 0;

  windowTarget.addEventListener(AUTH_STATE_EVENT, () => {
    eventCount += 1;
  });

  setStoredAuth("jwt-token", USER);

  assert.equal(getStoredToken(), "jwt-token");
  assert.deepEqual(getStoredUser(), USER);
  assert.equal(eventCount, 1);
});

test("returns null when stored user payload is malformed", () => {
  const { storage } = installBrowserMocks();

  storage.setItem("token", "jwt-token");
  storage.setItem("user", "{invalid-json");

  assert.equal(getStoredUser(), null);
});

test("clears token, user cache, and persisted store state", () => {
  const { storage, windowTarget } = installBrowserMocks();
  let eventCount = 0;

  windowTarget.addEventListener(AUTH_STATE_EVENT, () => {
    eventCount += 1;
  });

  setStoredAuth("jwt-token", USER);
  storage.setItem("library-storage", "{\"stale\":true}");
  clearStoredAuth();

  assert.equal(storage.getItem("token"), null);
  assert.equal(storage.getItem("user"), null);
  assert.equal(storage.getItem("library-storage"), null);
  assert.equal(eventCount, 2);
});
