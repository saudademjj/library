"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ArrowLeft,
  LogOut,
  User,
  Calendar,
  MapPin,
  Menu,
  X,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import {
  AUTH_STATE_EVENT,
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
} from "@/lib/client-auth";

interface RouteConfig {
  title: string;
  showBack: boolean;
  backHref: string;
  transparent: boolean;
}

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  transparent?: boolean;
  actions?: React.ReactNode;
}

const ROUTE_CONFIG: Record<string, RouteConfig> = {
  "/dashboard": { title: "Library.io", showBack: false, backHref: "", transparent: false },
  "/seats": { title: "空间预约", showBack: true, backHref: "/dashboard", transparent: false },
  "/reservations": { title: "我的预约", showBack: true, backHref: "/dashboard", transparent: false },
  "/profile": { title: "账户设置", showBack: true, backHref: "/dashboard", transparent: false },
};

export default function AppHeader(props?: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Determine configuration based on current path
  const getConfig = (): RouteConfig => {
    // Exact match
    if (ROUTE_CONFIG[pathname]) {
      return ROUTE_CONFIG[pathname];
    }
    // Dynamic routes handling
    if (pathname.startsWith("/reservations/")) {
      return { title: "预约详情", showBack: true, backHref: "/reservations", transparent: false };
    }
    // Default fallback
    return { title: "Library.io", showBack: false, backHref: "/", transparent: false };
  };

  const defaultConfig = getConfig();

  // Merge props with default config
  const config = {
    title: props?.title ?? defaultConfig.title,
    showBack: props?.showBack ?? defaultConfig.showBack,
    backHref: props?.backHref ?? defaultConfig.backHref,
    transparent: props?.transparent ?? defaultConfig.transparent,
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        return;
      }

      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener(AUTH_STATE_EVENT, syncAuthState);
    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener(AUTH_STATE_EVENT, syncAuthState);
    };
  }, [setUser]);

  const handleLogout = () => {
    clearStoredAuth();
    setUser(null);
    setMobileMenuOpen(false);
    router.replace("/");
  };

  const navItems = [
    { href: "/seats", label: "预约座位", icon: MapPin },
    { href: "/reservations", label: "我的预约", icon: Calendar },
    { href: "/profile", label: "个人中心", icon: User },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const isTransparent = config.transparent && !scrolled;

  return (
    <>
      <header 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500 border-b",
          isTransparent
            ? "bg-transparent border-transparent"
            : "bg-white/80 backdrop-blur-xl border-gray-100/50 shadow-sm supports-[backdrop-filter]:bg-white/60"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative flex h-16 sm:h-20 items-center justify-between">
            
            {/* Left Section */}
            <div className="flex items-center gap-4 z-20 relative">
              {config.showBack ? (
                <Link
                  href={config.backHref}
                  aria-label="返回上一页"
                  className={cn(
                    "group flex items-center justify-center h-10 w-10 rounded-full transition-all border",
                    isTransparent 
                      ? "text-white/80 hover:text-white hover:bg-white/10 border-transparent" 
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 border-transparent hover:border-gray-200"
                  )}
                >
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                  <div className={cn(
                    "p-2.5 rounded-xl shadow-lg ring-1 transition-all duration-300",
                    isTransparent
                      ? "bg-white/10 ring-white/10 shadow-black/5" 
                      : "bg-gray-900 shadow-gray-900/10 ring-black/5 group-hover:shadow-gray-900/20"
                  )}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <span className={cn(
                    "font-bold text-lg tracking-tight hidden sm:block transition-colors",
                    isTransparent ? "text-white" : "text-gray-900"
                  )}>
                    Library.io
                  </span>
                </Link>
              )}

              {config.title && config.title !== "Library.io" && (
                <div 
                  key={config.title}
                  className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500"
                >
                  {config.showBack && <div className={cn("h-5 w-px", isTransparent ? "bg-white/20" : "bg-gray-200")} />}
                  <h1 className={cn(
                    "text-base sm:text-lg font-bold truncate max-w-[150px] sm:max-w-xs tracking-tight",
                    isTransparent ? "text-white" : "text-gray-900"
                  )}>
                    {config.title}
                  </h1>
                </div>
              )}
            </div>

            {/* Centered Desktop Navigation */}
            {user && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-10">
                <nav className={cn(
                  "flex items-center gap-1.5 p-1.5 rounded-full border shadow-inner transition-colors",
                  isTransparent 
                    ? "bg-black/20 border-white/10" 
                    : "bg-gray-100/50 border-gray-200/50"
                )}>
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "relative h-9 px-5 rounded-full text-sm font-medium transition-all duration-300",
                            active
                              ? isTransparent
                                ? "bg-white/20 text-white shadow-sm ring-1 ring-white/10"
                                : "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                              : isTransparent
                                ? "text-white/60 hover:text-white hover:bg-white/10"
                                : "text-gray-500 hover:text-gray-900 hover:bg-white/60"
                          )}
                        >
                          <item.icon className={cn(
                            "h-4 w-4 mr-2 transition-colors", 
                            active 
                              ? isTransparent ? "text-white" : "text-gray-900"
                              : isTransparent ? "text-white/60" : "text-gray-400"
                          )} />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Right Section */}
            <div className="flex items-center gap-3 z-20 relative">
              {/* Custom Actions */}
              {props?.actions && <div className="flex items-center gap-2">{props.actions}</div>}

              {/* Special Action for Reservations Page */}
              {pathname === "/reservations" && (
                <Link href="/seats">
                  <Button size="sm" className="hidden sm:flex rounded-full bg-gray-900 hover:bg-black text-white px-4">
                    <Plus className="h-4 w-4 mr-1" /> 新预约
                  </Button>
                </Link>
              )}

              {user ? (
                <>
                  <div className={cn(
                    "hidden md:flex items-center gap-4 pl-4 border-l ml-1",
                    isTransparent ? "border-white/20" : "border-gray-200/60"
                  )}>
                    <div className="flex flex-col items-end mr-1">
                      <span className={cn(
                        "text-sm font-bold leading-none",
                        isTransparent ? "text-white" : "text-gray-900"
                      )}>
                        {user.name}
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium uppercase tracking-wider mt-0.5",
                        isTransparent ? "text-white/60" : "text-gray-400"
                      )}>
                        {user.studentId}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className={cn(
                        "rounded-full px-4 h-9 font-medium transition-all duration-300 border flex items-center gap-2 group",
                        isTransparent
                          ? "text-white/60 hover:text-white hover:bg-white/10 border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5"
                          : "text-gray-500 hover:text-gray-900 bg-gray-50/50 border-gray-200/50 hover:bg-gray-100 hover:border-gray-300 hover:shadow-md hover:shadow-gray-900/5"
                      )}
                    >
                      <LogOut className="h-4 w-4 group-hover:-rotate-12 transition-transform duration-300" />
                      <span className="text-xs font-bold uppercase tracking-wider">退出</span>
                    </Button>
                  </div>

                  {/* Mobile Menu Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "md:hidden rounded-full",
                      isTransparent ? "text-white hover:bg-white/10" : "text-gray-900 hover:bg-gray-100"
                    )}
                    aria-label={mobileMenuOpen ? "关闭菜单" : "打开菜单"}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="app-header-mobile-menu"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen 
                      ? <X className="h-5 w-5" /> 
                      : <Menu className="h-5 w-5" />
                    }
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn(
                        "rounded-full px-5 font-medium",
                        isTransparent ? "text-white hover:bg-white/10" : "text-gray-600 hover:bg-gray-100/80"
                      )}
                    >
                      登录
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-gray-900 hover:bg-black text-white rounded-full px-6 shadow-lg shadow-gray-900/20 font-medium transition-transform hover:scale-105 active:scale-95">
                      注册
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {user && mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="app-header-mobile-menu"
            className="fixed top-[65px] left-4 right-4 bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-top-4 duration-300 ring-1 ring-black/5"
          >
            <nav className="p-2 space-y-1">
              {navItems.map((item) => {
                 const active = isActive(item.href);
                 return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all",
                      active
                        ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                        : "text-gray-600 hover:bg-gray-50"
                    )}>
                      <item.icon className={cn("h-5 w-5", active ? "text-gray-200" : "text-gray-400")} />
                      {item.label}
                      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    </div>
                  </Link>
                );
              })}

              <div className="mt-2 pt-2 border-t border-gray-100/50">
                <div className="px-4 py-3 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{user.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{user.studentId}</span>
                   </div>
                   <button
                    type="button"
                    aria-label="退出账户"
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100/80 hover:bg-gray-900 hover:text-white border border-gray-200/50 hover:border-gray-900 transition-all duration-300 shadow-sm hover:shadow-md group"
                  >
                    <LogOut className="h-4 w-4 group-hover:-rotate-12 transition-transform duration-300" />
                    <span className="uppercase tracking-wider">退出账户</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
