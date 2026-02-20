import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, AlertTriangle, Info, Trash2, Zap, Monitor, VolumeX, Lightbulb, CalendarClock, Clock } from "lucide-react";
import type { EnhancedSeatResponse, SeatFacilities, CreateReservationRequest } from "@/lib/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { formatTime, formatDate, diffMinutes, toChineseTime, addDays, setTime, now } from "@/lib/datetime";

interface SeatDetailPanelProps {
  seat: EnhancedSeatResponse;
  zone?: { name: string; floor: number; description?: string | null };
  onClose: () => void;
  onReserve?: (seatId: number, options?: Partial<CreateReservationRequest>) => void;
  onCancel?: (reservationId: number) => void;
}

export default function SeatDetailPanel({
  seat,
  zone,
  onClose,
  onReserve,
  onCancel,
}: SeatDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [showLimitedConfirm, setShowLimitedConfirm] = useState(false);
  const [dailyReservations, setDailyReservations] = useState<{ status: string; id: number; isMine: boolean }[]>([]);
  const [advanceHour, setAdvanceHour] = useState(9); // 默认早上9点
  const [advanceMinute, setAdvanceMinute] = useState(0);

  const todayStr = formatDate(now());

  // Fetch daily reservations (only for today now)
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setDailyReservations([]);
          return;
        }

        const res = await fetch(`/api/seats/${seat.id}/reservations?date=${todayStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDailyReservations(data.data);
        }
      } catch (e) {
        console.error("Failed to fetch reservations", e);
        toast.error("加载座位预约信息失败");
      }
    };
    fetchReservations();
  }, [seat.id, todayStr]);

  // Check if I have a reservation
  const myReservation = useMemo(
    () =>
      dailyReservations.find(r =>
        r.isMine &&
        (r.status === 'active' || r.status === 'pending')
      ),
    [dailyReservations]
  );

  const facilities = useMemo(() => {
    const rawFacilities = seat.facilities as unknown;
    if (!rawFacilities) return null;

    if (typeof rawFacilities === "string") {
      try {
        return JSON.parse(rawFacilities) as SeatFacilities;
      } catch {
        return null;
      }
    }

    if (typeof rawFacilities === "object") {
      return rawFacilities as SeatFacilities;
    }

    return null;
  }, [seat.facilities]);

  const displayStatus = seat.displayStatus || (seat.isAvailable ? "free" : "occupied");
  const isNowAvailable = displayStatus === "free" || displayStatus === "limited";

  // Helper: format availableUntil time for display
  const getAvailableUntilTime = () => {
    if (!seat.availableUntil) return null;
    return formatTime(seat.availableUntil);
  };

  const handleAction = async (skipConfirm = false) => {
    if (loading) return;

    // For limited seats, show confirmation dialog first
    if (!skipConfirm && displayStatus === "limited" && !myReservation && seat.availableUntil) {
      setShowLimitedConfirm(true);
      return;
    }

    setLoading(true);
    try {
      if (onReserve) {
        await onReserve(seat.id, {
          reservationType: "walk_in" // Always walk_in
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 检查是否在晚8点之后（可进行提前预约）- 使用 useEffect 避免 SSR 水合问题
  const [isAfter8PM, setIsAfter8PM] = useState(false);
  useEffect(() => {
    const currentHour = now().getHours();
    setIsAfter8PM(currentHour >= 20);
  }, []);

  // 提前预约处理
  const handleAdvanceReserve = async () => {
    if (advanceLoading) return;
    setAdvanceLoading(true);
    try {
      // 构建明天的预约时间
      const tomorrow = addDays(now(), 1);
      const startTime = setTime(tomorrow, advanceHour, advanceMinute, 0);

      if (onReserve) {
        await onReserve(seat.id, {
          reservationType: "advance",
          startTime: startTime.toISOString()
        });
      }
    } finally {
      setAdvanceLoading(false);
    }
  };

  const getStatusStyle = () => {
    if (myReservation) return "bg-blue-500 text-white";

    switch (displayStatus) {
      case "free":
        return "bg-emerald-500 text-white shadow-emerald-200";
      case "limited":
        return "bg-amber-500 text-white shadow-amber-200";
      case "occupied":
        return "bg-rose-500 text-white shadow-rose-200";
      case "locked":
        return "bg-gray-400 text-white";
      default:
        return "bg-gray-200 text-gray-500";
    }
  };

  const getStatusLabel = () => {
    if (myReservation) return "当前预约";
    switch (displayStatus) {
      case "free": return "即刻空闲";
      case "limited": return "限时可用";
      case "occupied": return "占座中";
      case "locked": return "预约中";
      default: return "未知状态";
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white/40 backdrop-blur-xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-gray-900">席位详情</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5 uppercase">SEAT IDENTIFICATION</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100 transition-colors">
          <span className="sr-only">关闭席位详情</span>
          <X className="h-5 w-5 text-gray-400" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Header Info */}
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-5xl font-black tracking-tighter text-gray-900 leading-none">
                {seat.seatNumber}
              </h4>
              <div className="flex items-center gap-2 mt-3 text-gray-500">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">{zone?.name} · {zone?.floor}F</span>
              </div>
            </div>
            <Badge className={cn("px-3 py-1.5 rounded-full border-0 text-xs font-bold shadow-lg", getStatusStyle())}>
              {getStatusLabel()}
            </Badge>
          </div>

          {!myReservation && isNowAvailable && displayStatus === "limited" && seat.availableUntil && (
            <div className="mt-6 group relative rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 border border-amber-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="bg-white p-2 rounded-xl shadow-sm text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-amber-900 text-sm">时段衔接模式</p>
                  <p className="mt-1 text-xs text-amber-700/80 leading-relaxed">
                    该席位后续已有预约，您需在 <span className="font-bold underline">{formatTime(seat.availableUntil)}</span> 前完成使用并离座。
                  </p>
                  {seat.availableUntil && (() => {
                    const availableMinutes = diffMinutes(toChineseTime(seat.availableUntil), new Date());
                    if (availableMinutes > 0) {
                      return (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1 flex-1 bg-amber-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-1/2 rounded-full"></div>
                          </div>
                          <span className="text-[10px] font-black text-amber-600 uppercase">
                            剩余 {Math.floor(availableMinutes / 60)}小时 {availableMinutes % 60}分
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}

          {myReservation && (
            <div className="mt-6 rounded-2xl bg-blue-50/50 p-5 border border-blue-100 flex items-center gap-4">
              <div className="bg-white p-2 rounded-xl shadow-sm text-blue-500">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-blue-900 text-sm">当前已锁定</p>
                <p className="text-xs text-blue-600/80">您可以前往“预约管理”查看更多详情</p>
              </div>
            </div>
          )}
        </section>

        {/* Facilities Section */}
        {facilities && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">设施与环境</h5>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "电源插座", icon: <Zap className="h-4 w-4" />, active: facilities.hasSocket },
                { label: "独立台灯", icon: <Lightbulb className="h-4 w-4" />, active: facilities.hasLamp },
                { label: "专用电脑", icon: <Monitor className="h-4 w-4" />, active: facilities.hasComputer },
                { label: "绝对静音", icon: <VolumeX className="h-4 w-4" />, active: facilities.isQuietZone }
              ].map((f, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  f.active ? "bg-white border-gray-200 shadow-sm text-gray-900" : "bg-gray-50/50 border-gray-100 text-gray-300 opacity-60"
                )}>
                  <div className={cn("p-1.5 rounded-lg", f.active ? "bg-gray-900 text-white" : "bg-gray-100")}>
                    {f.icon}
                  </div>
                  <span className="text-xs font-semibold">{f.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Note Section */}
        {seat.note && (
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">注意事项</h5>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 italic text-sm text-gray-500 leading-relaxed">
              “{seat.note}”
            </div>
          </section>
        )}

        {/* Advance Booking Section - 全天可见，8点后开放 */}
        {!myReservation && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">提前预约</h5>
            <div className={cn(
              "rounded-2xl p-5 border shadow-sm transition-all",
              isAfter8PM
                ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100"
                : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
            )}>
              <div className="flex items-start gap-3 mb-4">
                <div className={cn(
                  "p-2 rounded-xl shadow-sm",
                  isAfter8PM ? "bg-white text-indigo-500" : "bg-gray-100 text-gray-400"
                )}>
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn(
                    "font-bold text-sm",
                    isAfter8PM ? "text-indigo-900" : "text-gray-600"
                  )}>预约明天座位</p>
                  <p className={cn(
                    "text-xs mt-1",
                    isAfter8PM ? "text-indigo-700/80" : "text-gray-500"
                  )}>
                    {isAfter8PM
                      ? "选择您明天计划签到的时间"
                      : "每晚 20:00 开放次日预约"}
                  </p>
                </div>
              </div>

              {isAfter8PM ? (
                <>
                  {/* 时间选择器 - 8点后显示 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-1 bg-white rounded-xl p-3 border border-indigo-100">
                      <Clock className="h-4 w-4 text-indigo-400" />
                      <select
                        value={advanceHour}
                        onChange={(e) => setAdvanceHour(Number(e.target.value))}
                        className="bg-transparent text-lg font-bold text-indigo-900 outline-none cursor-pointer"
                      >
                        {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="text-lg font-bold text-indigo-400">:</span>
                      <select
                        value={advanceMinute}
                        onChange={(e) => setAdvanceMinute(Number(e.target.value))}
                        className="bg-transparent text-lg font-bold text-indigo-900 outline-none cursor-pointer"
                      >
                        {[0, 15, 30, 45].map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full h-12 font-bold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handleAdvanceReserve}
                    disabled={advanceLoading}
                  >
                    {advanceLoading ? "提交中..." : "预约明天此座位"}
                  </Button>
                </>
              ) : (
                /* 8点前显示禁用状态 */
                <div className="flex items-center justify-center gap-2 p-4 bg-gray-100/80 rounded-xl border border-gray-200">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">今晚 20:00 后开放预约</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-6 border-t border-gray-100 bg-white/50 backdrop-blur-md">
        {!myReservation ? (
          <Button
            size="lg"
            className={cn(
              "w-full h-14 text-lg font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]",
              displayStatus === "limited"
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200"
                : "bg-gray-900 hover:bg-black shadow-gray-200"
            )}
            onClick={() => handleAction()}
            disabled={loading || !isNowAvailable}
          >
            {loading ? "提交中..." : (displayStatus === "limited" ? "限时锁定" : "立即锁定")}
          </Button>
        ) : (
          <div className="space-y-3">
            <Link href={`/reservations/${myReservation.id}`} className="block w-full">
              <Button size="lg" className="w-full h-14 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200">
                管理预约行程
              </Button>
            </Link>
            {onCancel && (
              <Button
                variant="ghost"
                className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-medium"
                onClick={() => onCancel(myReservation.id)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                取消当前预约
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Limited Seat Confirmation Dialog */}
      <ConfirmDialog
        open={showLimitedConfirm}
        onOpenChange={setShowLimitedConfirm}
        title="限时使用确认"
        description={`该席位在后续时段已被预约，您需在 ${getAvailableUntilTime() || "--:--"} 前完成使用。到期后系统将自动释放席位。\n\n确定要继续吗？`}
        variant="default"
        confirmText="确定使用"
        cancelText="返回选择"
        onConfirm={async () => {
          setShowLimitedConfirm(false);
          await handleAction(true);
        }}
        loading={loading}
      />
    </div>
  );
}
