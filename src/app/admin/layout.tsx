"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  MapPin,
  Armchair,
  CalendarDays,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearStoredAuth } from "@/lib/client-auth";

interface MenuItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { href: "/admin", label: "控制台概览", icon: <LayoutDashboard className="h-5 w-5" /> },
      { href: "/admin/zones", label: "区域管理", icon: <MapPin className="h-5 w-5" /> },
      { href: "/admin/seats", label: "席位资源", icon: <Armchair className="h-5 w-5" /> },
      { href: "/admin/reservations", label: "预约调度", icon: <CalendarDays className="h-5 w-5" /> },
      { href: "/admin/users", label: "用户管理", icon: <Users className="h-5 w-5" /> },
    ],
    [],
  );

  useEffect(() => {
    const verifyAdmin = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!data.ok) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (data.data.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setCheckingAuth(false);
      } catch {
        clearStoredAuth();
        router.replace("/login");
      }
    };

    void verifyAdmin();
  }, [router]);

  const handleLogout = () => {
    clearStoredAuth();
    router.replace("/login");
  };

  const renderMenu = (mobile = false) => (
    <nav className={mobile ? "space-y-1" : "flex-1 p-4 space-y-1"}>
      {menuItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} onClick={mobile ? () => setMobileMenuOpen(false) : undefined}>
            <div
              className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="mr-3 opacity-90">{item.icon}</span>
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">正在验证权限...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <BookOpen className="h-6 w-6 text-gray-900 mr-2" />
          <span className="font-bold text-lg text-gray-900 tracking-tight">系统管理中心</span>
        </div>

        {renderMenu()}

        <div className="p-4 border-t border-gray-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 z-50 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gray-900" />
          <span className="font-semibold text-sm text-gray-900">后台管理</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 shadow-lg">
            {renderMenu(true)}
            <div className="pt-2 border-t border-gray-100 mt-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-5 w-5" />
                退出登录
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden pt-14 md:pt-0">
        <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 items-center justify-between sticky top-0 z-40">
          <div className="text-sm text-gray-500">
            后台管理 <span className="mx-2">/</span>{" "}
            <span className="text-gray-900 font-medium">
              {menuItems.find((i) => i.href === pathname)?.label || "概览"}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-gray-900/20">
            AD
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
