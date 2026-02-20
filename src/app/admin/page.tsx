"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Armchair, Calendar, Users, TrendingUp, Activity, Clock } from "lucide-react";
import type { EnhancedSeatResponse, ReservationResponse, ZoneResponse } from "@/lib/types";

interface Stats {
  zones: number;
  seats: number;
  users: number;
  todayReservations: number;
}

interface WeeklyData {
  day: string;
  count: number;
}

interface ZoneStats {
  id: number;
  name: string;
  floor: number;
  reservationCount: number;
  totalSeats: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [recentReservations, setRecentReservations] = useState<ReservationResponse[]>([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.ok) setStats(data.data);
      else toast.error(data.error || "加载统计数据失败");
    } catch (e) {
      console.error(e);
      toast.error("加载统计数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeeklyData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/stats/weekly", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.ok) {
        setWeeklyData(data.data);
      } else {
        setWeeklyData([]);
      }
    } catch {
      setWeeklyData([]);
      toast.error("加载近7天趋势失败");
    }
  }, []);

  const loadZoneStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const [zonesRes, seatsRes] = await Promise.all([
        fetch("/api/zones", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/seats", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const zonesData = await zonesRes.json();
      const seatsData = await seatsRes.json();

      if (zonesData.ok && seatsData.ok) {
        const zones = (zonesData.data || []) as ZoneResponse[];
        const seats = (seatsData.data || []) as EnhancedSeatResponse[];

        // 计算每个区域的座位统计
        const zoneStatsMap = new Map<number, { occupied: number; total: number }>();
        zones.forEach((zone) => {
          zoneStatsMap.set(zone.id, { occupied: 0, total: 0 });
        });

        // 统计每个区域的座位数和占用数
        seats.forEach((seat) => {
          if (seat.zoneId) {
            const current = zoneStatsMap.get(seat.zoneId);
            if (current) {
              zoneStatsMap.set(seat.zoneId, {
                total: current.total + 1,
                occupied: current.occupied + (seat.displayStatus === 'occupied' ? 1 : 0)
              });
            }
          }
        });

        setZoneStats(zones.map((zone) => {
          const stats = zoneStatsMap.get(zone.id) || { occupied: 0, total: 0 };
          return {
            id: zone.id,
            name: zone.name,
            floor: zone.floor,
            reservationCount: stats.occupied,
            totalSeats: stats.total
          };
        }));
      }
    } catch (e) {
      console.error("加载区域统计失败", e);
      toast.error("加载区域使用统计失败");
    }
  }, []);

  const loadRecentReservations = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/reservations?limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.ok) {
        setRecentReservations((data.data || []).slice(0, 5));
      }
    } catch (e) {
      console.error("加载最近预约失败", e);
      toast.error("加载最近预约失败");
    }
  }, []);

  useEffect(() => {
    void loadStats();
    void loadWeeklyData();
    void loadZoneStats();
    void loadRecentReservations();
  }, [loadRecentReservations, loadStats, loadWeeklyData, loadZoneStats]);

  const floorCount = useMemo(() => {
    if (zoneStats.length === 0) return 0;
    return new Set(zoneStats.map((zone) => zone.floor)).size;
  }, [zoneStats]);

  const getMaxCount = () => {
    if (weeklyData.length === 0) return 100;
    return Math.max(...weeklyData.map(d => d.count), 1);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">加载数据中...</div>;

  return (
    <div className="space-y-8">
      {/* 顶部数据卡片 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="今日预约" 
          value={stats?.todayReservations || 0} 
          icon={<Calendar className="h-5 w-5 text-blue-600" />} 
          desc="实时统计"
          color="bg-blue-50"
        />
        <StatsCard 
          title="注册用户" 
          value={stats?.users || 0} 
          icon={<Users className="h-5 w-5 text-purple-600" />} 
          desc="实时统计"
          color="bg-purple-50"
        />
        <StatsCard 
          title="总座位数" 
          value={stats?.seats || 0} 
          icon={<Armchair className="h-5 w-5 text-green-600" />} 
          desc={floorCount > 0 ? `分布在 ${floorCount} 个楼层` : "座位实时统计"}
          color="bg-green-50"
        />
        <StatsCard 
          title="开放区域" 
          value={stats?.zones || 0} 
          icon={<MapPin className="h-5 w-5 text-orange-600" />} 
          desc="运行正常"
          color="bg-orange-50"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              预约趋势 (近7天)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {weeklyData.length > 0 ? weeklyData.map((item, i) => {
                const height = (item.count / getMaxCount()) * 100;
                return (
                  <div
                    key={i}
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md relative group hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
                      {item.count} 单预约
                    </div>
                  </div>
                );
              }) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  暂无数据
                </div>
              )}
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-400">
              {weeklyData.map((item, i) => (
                <span key={i}>{item.day}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              区域使用情况
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {zoneStats.length > 0 ? zoneStats.map((zone, i) => {
              const percentage = zone.totalSeats > 0
                ? Math.round((zone.reservationCount / zone.totalSeats) * 100)
                : 0;
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
              return (
                <div key={zone.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">{zone.floor}F {zone.name}</span>
                    <span className="text-gray-500">{zone.reservationCount} / {zone.totalSeats} 使用中</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-gray-400 py-8">暂无区域数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近预约 */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            最近预约记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentReservations.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentReservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      r.status === 'active' ? 'bg-green-500' :
                      r.status === 'pending' ? 'bg-amber-500' :
                      r.status === 'completed' ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <span className="font-medium text-gray-900">
                        {r.user?.name || '用户'} - {r.seat?.seatNumber || '座位'}
                      </span>
                      <p className="text-xs text-gray-400">
                        {r.seat?.zone?.name || '区域'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      r.status === 'active' ? 'bg-green-50 text-green-600' :
                      r.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      r.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'
                    }`}>
                      {r.status === 'active' ? '使用中' :
                       r.status === 'pending' ? '待签到' :
                       r.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">暂无预约记录</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  trend?: string;
  desc?: string;
  color: string;
}

function StatsCard({ title, value, icon, trend, desc, color }: StatsCardProps) {
  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            {icon}
          </div>
        </div>
        {(trend || desc) && (
          <div className="mt-4 flex items-center text-xs">
            {trend && <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded mr-2">{trend}</span>}
            <span className="text-gray-400">{desc || "较昨日"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
