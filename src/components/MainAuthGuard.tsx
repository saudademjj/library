"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  AUTH_STATE_EVENT,
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
} from "@/lib/client-auth";

type GuardStatus = "checking" | "ready";

export default function MainAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useStore();
  const [status, setStatus] = useState<GuardStatus>("checking");

  const verifyAuth = useCallback(async () => {
    setStatus("checking");

    const token = getStoredToken();
    if (!token) {
      setUser(null);
      router.replace("/login");
      return;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!data.ok) {
        clearStoredAuth();
        setUser(null);
        router.replace("/login");
        return;
      }

      if (data.data.role === "admin") {
        router.replace("/admin");
        return;
      }

      setUser(data.data);
      setStatus("ready");
    } catch {
      clearStoredAuth();
      setUser(null);
      router.replace("/login");
    }
  }, [router, setUser]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void verifyAuth();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [verifyAuth]);

  useEffect(() => {
    const onAuthChanged = () => {
      void verifyAuth();
    };

    window.addEventListener("storage", onAuthChanged);
    window.addEventListener(AUTH_STATE_EVENT, onAuthChanged);
    return () => {
      window.removeEventListener("storage", onAuthChanged);
      window.removeEventListener(AUTH_STATE_EVENT, onAuthChanged);
    };
  }, [verifyAuth]);

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return <>{children}</>;
}
