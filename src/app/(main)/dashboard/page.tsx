"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  User,
  BookOpen,
  Clock,
  ArrowRight,
  Coffee,
  TrendingUp,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import Leaderboard from "@/components/Leaderboard";
import { formatTime } from "@/lib/datetime";
import { useStore } from "@/lib/store";
import { clearStoredAuth, getStoredToken } from "@/lib/client-auth";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user, setUser,
    zones, setZones,
    reservations, setReservations,
    userStats, setUserStats,
    isFresh, lastUserFetch, lastZonesFetch, lastReservationsFetch, lastStatsFetch
  } = useStore();

  const fetchUser = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.ok) {
        if (data.data.role === "admin") {
          router.replace("/admin");
          return;
        }
        setUser(data.data);
      } else {
        clearStoredAuth();
        setUser(null);
        router.replace("/login");
      }
    } catch {
      clearStoredAuth();
      setUser(null);
      toast.error("登录状态已失效，请重新登录");
      router.replace("/login");
    }
  }, [router, setUser]);

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch("/api/zones");
      const data = await res.json();
      if (data.ok) setZones(data.data);
    } catch (e) {
      console.error("获取区域失败", e);
      toast.error("加载区域失败，请稍后重试");
    }
  }, [setZones]);

  const fetchUserStats = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/leaderboard?period=month&limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.data.myRank) {
        setUserStats({
          totalMinutes: data.data.myRank.totalMinutes,
          reservationCount: data.data.myRank.reservationCount,
          rank: data.data.myRank.rank,
        });
      }
    } catch (e) {
      console.error("获取用户统计失败", e);
      toast.error("加载统计失败，请稍后重试");
    }
  }, [setUserStats]);

  const fetchReservations = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/reservations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setReservations(data.data);
      }
    } catch (e) {
      console.error("获取预约失败", e);
      toast.error("加载预约失败，请稍后重试");
    }
  }, [setReservations]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!isFresh(lastUserFetch)) {
      void fetchUser(token);
    }
    if (!isFresh(lastZonesFetch)) void fetchZones();
    if (!isFresh(lastReservationsFetch)) void fetchReservations(token);
    if (!isFresh(lastStatsFetch)) void fetchUserStats(token);
  }, [
    fetchReservations,
    fetchUser,
    fetchUserStats,
    fetchZones,
    isFresh,
    lastReservationsFetch,
    lastStatsFetch,
    lastUserFetch,
    lastZonesFetch,
    router,
  ]);

  // Derive active reservation
  const activeReservation = reservations.find(
    (reservation) => reservation.status === "active" || reservation.status === "pending"
  ) || null;
  const activeZones = zones.filter((zone) => zone.isActive).sort((a, b) => a.floor - b.floor);

  // 格式化学习时长
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}小时` : `${hours}小时${mins}分`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-200"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-5xl">
        {/* 欢迎区域 */}

        <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-gray-900 mb-4 uppercase">
            你好，<span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-400">{user.name}</span>
          </h1>
          <div className="flex items-center gap-3 text-gray-400">
            <div className="h-1 w-8 bg-gray-900 rounded-full"></div>
            <p className="text-sm font-bold uppercase tracking-[0.3em]">
              今日，您想在何处开启专注之旅？
            </p>
          </div>
        </section>

        {/* 用户学习统计 */}
        {userStats && (
          <section className="mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">本月学习</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {formatDuration(userStats.totalMinutes)}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">预约次数</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {userStats.reservationCount}<span className="text-lg text-gray-400 ml-1">次</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">当前排名</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {userStats.rank ? `第${userStats.rank}名` : '-'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 当前状态卡片 */}
        {activeReservation ? (
          <section className="mb-16 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">CURRENT STATUS</h2>
              <Link href="/reservations" className="text-xs font-bold text-gray-900 hover:underline flex items-center gap-1">
                查看全部 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-2xl shadow-gray-900/5 flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden group hover:shadow-gray-900/10 transition-all duration-500">
              <div className="absolute top-0 right-0 p-40 bg-gray-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-50 transition-colors duration-700"></div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-full border-0 text-[10px] font-black uppercase tracking-widest shadow-lg",
                    activeReservation.status === 'active' ? "bg-green-500 text-white shadow-green-200" : "bg-amber-500 text-white shadow-amber-200"
                  )}>
                    {activeReservation.status === 'active' ? '进行中' : '待签到'}
                  </Badge>
                  <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">
                    ID #{activeReservation.id}
                  </span>
                </div>
                <div>
                  <div className="text-5xl font-black tracking-tighter text-gray-900 mb-1 uppercase">
                    {activeReservation.seat?.seatNumber || `${activeReservation.seatId}号`} 座
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatTime(activeReservation.startTime)} — {formatTime(activeReservation.endTime)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 md:mt-0">
                <Link href={`/reservations/${activeReservation.id}`}>
                  <Button className="h-14 px-10 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold shadow-xl shadow-gray-900/20 transition-all hover:scale-105 active:scale-95">
                    查看详情
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* 核心功能入口 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* 预约选座 */}
          <Link href="/seats" className="group">
            <div className="h-full bg-gray-900 rounded-[32px] p-10 text-white shadow-2xl shadow-gray-900/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-gray-900/40 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                <MapPin className="h-72 w-72" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="bg-white/10 w-fit p-4 rounded-2xl mb-8 backdrop-blur-sm ring-1 ring-white/20">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter mb-3 uppercase leading-none">空间预约</h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100">
                    浏览全馆平面布局，<br />锁定理想学习点位。
                  </p>
                </div>
                <div className="mt-12 flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors">
                  即刻预约 <ArrowRight className="h-3 w-3 ml-3 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </div>
          </Link>

          {/* 我的预约 */}
          <Link href="/reservations" className="group">
            <div className="h-full bg-white rounded-[32px] p-10 border border-gray-100 shadow-xl shadow-gray-900/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-gray-900/10 relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="bg-gray-50 w-fit p-4 rounded-2xl mb-8 border border-gray-100">
                    <Calendar className="h-6 w-6 text-gray-900" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter mb-3 text-gray-900 uppercase leading-none">预约管理</h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100">
                    追踪历史履约记录，<br />管控当前座位状态。
                  </p>
                </div>
                <div className="mt-12 flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 group-hover:text-gray-900 transition-colors">
                  历史记录 <ArrowRight className="h-3 w-3 ml-3 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </div>
          </Link>

          {/* 个人中心 */}
          <Link href="/profile" className="group">
            <div className="h-full bg-white rounded-[32px] p-10 border border-gray-100 shadow-xl shadow-gray-900/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-gray-900/10 relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="bg-blue-50 w-fit p-4 rounded-2xl mb-8 border border-blue-100">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter mb-3 text-gray-900 uppercase leading-none">账户中心</h3>
                  <div className="space-y-3 mt-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">学号</span>
                      <span className="font-bold text-gray-900">{user.studentId}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">姓名</span>
                      <span className="font-bold text-gray-900">{user.name}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-12 flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 group-hover:text-gray-900 transition-colors">
                  前往设置 <ArrowRight className="h-3 w-3 ml-3 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* 排行榜区域 */}
        <section className="mb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">学习排行</h2>
            <div className="h-px flex-1 bg-gray-100"></div>
          </div>
          <Leaderboard />
        </section>

        {/* 底部楼层概览 */}
        <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">空间导览</h2>
            <div className="h-px flex-1 bg-gray-100"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeZones.map((zone) => (
              <Link href={`/seats?zoneId=${zone.id}`} key={zone.id} className="block group">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-gray-900/10 hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-gray-900 tracking-tighter group-hover:text-gray-900 transition-colors">{zone.floor}F</span>
                    <div className="text-gray-200 group-hover:text-gray-900 transition-colors duration-500">
                      {zone.floor === 1 ? <Coffee className="h-5 w-5" /> :
                        zone.floor === 2 ? <User className="h-5 w-5" /> :
                          zone.floor === 3 ? <BookOpen className="h-5 w-5" /> :
                            <Clock className="h-5 w-5" />}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">{zone.name}</h4>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest truncate">{zone.description || "综合阅览区"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
