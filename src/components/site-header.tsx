"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, LogOut, MapPin, Shield, User } from "lucide-react";
import type { UserResponse } from "@/lib/types";
import { clearStoredAuth } from "@/lib/client-auth";

type SiteHeaderProps = {
  title?: string;
};

const readStoredUser = (): UserResponse | null => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  if (!token || !storedUser) return null;

  try {
    return JSON.parse(storedUser) as UserResponse;
  } catch {
    return null;
  }
};

export default function SiteHeader({ title = "图书馆座位预约" }: SiteHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(() => readStoredUser());

  useEffect(() => {
    const handleStorage = () => setUser(readStoredUser());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    setUser(null);
    router.replace("/");
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-xl font-semibold">{title}</h1>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  你好，{user.name}
                </span>
                {user.role === "admin" ? (
                  <Link href="/admin">
                    <Button variant="outline">
                      <Shield className="mr-2 h-4 w-4" />
                      管理后台
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/dashboard">
                      <Button variant="outline">
                        <User className="mr-2 h-4 w-4" />
                        我的主页
                      </Button>
                    </Link>
                    <Link href="/seats">
                      <Button variant="outline">
                        <MapPin className="mr-2 h-4 w-4" />
                        预约座位
                      </Button>
                    </Link>
                    <Link href="/reservations">
                      <Button variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        我的预约
                      </Button>
                    </Link>
                  </>
                )}
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  退出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">登录</Button>
                </Link>
                <Link href="/register">
                  <Button>注册</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
