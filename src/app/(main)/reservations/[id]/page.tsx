"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Timer,
  QrCode,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  LogOut as LogOutIcon
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { formatTime, formatDate, toChineseTime, now } from "@/lib/datetime";
import { DEFAULT_CHECKIN_WINDOW_MINUTES } from "@/lib/reservation-policy";
import { useStore } from "@/lib/store";

interface ReservationDetail {
  id: number;
  status: "pending" | "active" | "completed" | "cancelled";
  startTime: string;
  endTime: string;
  createdAt: string;
  seat: {
    id: number;
    seatNumber: string;
    zone: {
      id: number;
      name: string;
      floor: number;
      description?: string | null;
    };
  };
  user: {
    id: number;
    name: string;
    studentId: string;
  };
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { invalidateReservations } = useStore();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    variant: "default" | "danger";
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
    variant: "default",
  });

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const loadQRCode = useCallback(async (resId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/reservations/${resId}/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.ok) {
        setQrCode(data.data.qrCode);
      }
    } catch (error) {
      console.error("加载二维码失败:", error);
      toast.error("加载签到二维码失败，请稍后重试");
    }
  }, []);

  const loadReservation = useCallback(async (resId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`/api/reservations/${resId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.ok) {
        setReservation(data.data);
        // 如果预约状态是 pending 或 active，加载二维码
        if (data.data.status === 'pending' || data.data.status === 'active') {
          void loadQRCode(resId);
        }
      } else {
        toast.error(data.error || "加载预约详情失败");
        if (response.status === 404) router.push("/reservations");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [loadQRCode, router]);

  useEffect(() => {
    if (id) {
      void loadReservation(id);
    }
  }, [id, loadReservation]);

  // 实时倒计时
  useEffect(() => {
    if (!reservation || (reservation.status !== 'active' && reservation.status !== 'pending')) {
      return;
    }

    const updateRemainingTime = () => {
      const currentTime = now().getTime();
      const end = toChineseTime(reservation.endTime).getTime();
      const start = toChineseTime(reservation.startTime).getTime();

      if (reservation.status === 'active') {
        // 使用中: 显示剩余时间
        setRemainingTime(Math.max(0, end - currentTime));
      } else if (reservation.status === 'pending') {
        // 待签到: 显示距离开始的时间
        setRemainingTime(start - currentTime);
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  // 格式化倒计时显示
  const formatCountdown = (ms: number): string => {
    if (ms <= 0) return "00:00:00";
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const checkinAvailability = (() => {
    if (!reservation || reservation.status !== "pending") {
      return { allowed: false, reason: "" };
    }

    const currentTime = now().getTime();
    const startTime = toChineseTime(reservation.startTime).getTime();
    const diffMinutes = (currentTime - startTime) / 60000;

    if (diffMinutes < -DEFAULT_CHECKIN_WINDOW_MINUTES) {
      return {
        allowed: false,
        reason: `未到签到时间，请在开始前${DEFAULT_CHECKIN_WINDOW_MINUTES}分钟内签到`,
      };
    }

    if (diffMinutes > DEFAULT_CHECKIN_WINDOW_MINUTES) {
      return {
        allowed: false,
        reason: "签到窗口已过期，请刷新后查看预约状态",
      };
    }

    return { allowed: true, reason: "" };
  })();

  const handleAction = async (action: "checkin" | "finish" | "cancel") => {
    if (!reservation) return;
    if (action === "checkin" && !checkinAvailability.allowed) {
      toast.info(checkinAvailability.reason || "当前不可签到");
      return;
    }

    const config = {
      checkin: {
        title: "确认签到",
        desc: "确认已到达预定席位？签到后将正式开启您的专注时段。",
        url: `/api/reservations/${reservation.id}/checkin`,
        method: "POST",
        variant: "default" as const
      },
      finish: {
        title: "释放席位",
        desc: "确定提前结束使用并释放席位吗？",
        url: `/api/reservations/${reservation.id}/finish`,
        method: "POST",
        variant: "default" as const
      },
      cancel: {
        title: "取消本次预约",
        desc: "确定取消本次预约行程吗？此操作将无法撤销。",
        url: `/api/reservations/${reservation.id}/cancel`,
        method: "PATCH",
        variant: "danger" as const
      }
    };

    const cfg = config[action];

    setConfirmDialog({
      open: true,
      title: cfg.title,
      description: cfg.desc,
      variant: cfg.variant,
      action: async () => {
        setActionLoading(true);
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(cfg.url, {
            method: cfg.method,
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.ok) {
            toast.success("操作成功");
            invalidateReservations();
            loadReservation(reservation.id.toString());
          } else {
            toast.error(data.error || "操作失败");
          }
        } catch {
          toast.error("请求失败，请检查网络");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">正在加载详情...</p>
        </div>
      </div>
    );
  }

  if (!reservation) return null;

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "正在使用";
      case "pending": return "待签到";
      case "completed": return "已结束";
      case "cancelled": return "已取消";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Timer className="h-6 w-6" />;
      case "pending": return <AlertCircle className="h-6 w-6" />;
      case "completed": return <CheckCircle2 className="h-6 w-6" />;
      default: return <XCircle className="h-6 w-6" />;
    }
  };

  // Progress Calculation (UTC+8)
  const currentTime = now().getTime();
  const start = toChineseTime(reservation.startTime).getTime();
  const end = toChineseTime(reservation.endTime).getTime();
  const total = end - start;
  const current = currentTime - start;
  const progress = Math.min(Math.max((current / total) * 100, 0), 100);

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-gray-100 to-transparent rounded-full blur-3xl opacity-60 translate-y-1/2 -translate-x-1/2" />
      </div>

      <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        {/* Main Status Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden mb-6 border border-gray-100">
          <div className={cn("px-8 py-10 flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors duration-500", 
            reservation.status === 'active' ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white" :
            reservation.status === 'pending' ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
            "bg-white text-gray-900"
          )}>
            {/* Background Pattern for Active/Pending */}
            {(reservation.status === 'active' || reservation.status === 'pending') && (
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            )}
            
            <div className={cn("mb-4 p-4 rounded-full shadow-lg backdrop-blur-sm", 
              reservation.status === 'active' || reservation.status === 'pending' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            )}>
              {getStatusIcon(reservation.status)}
            </div>
            
            <h1 className={cn("text-3xl font-bold mb-2", 
              (reservation.status === 'active' || reservation.status === 'pending') ? "text-white" : "text-gray-900"
            )}>
              {getStatusText(reservation.status)}
            </h1>
            
            <p className={cn("text-sm opacity-90 mb-6 font-medium",
               (reservation.status === 'active' || reservation.status === 'pending') ? "text-blue-50" : "text-gray-500"
            )}>
              行程编号 #{reservation.id}
            </p>

            {/* Progress Bar (Only for Active) */}
            {reservation.status === 'active' && (
              <div className="w-full max-w-xs bg-black/10 rounded-full h-1.5 mb-2 overflow-hidden backdrop-blur-md">
                <div
                  className="bg-white h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {reservation.status === 'active' && (
              <div className="text-center">
                <p className="text-xs text-white/60 mb-1">剩余时间</p>
                <p className="text-2xl font-mono font-bold text-white tracking-wider">{formatCountdown(remainingTime)}</p>
              </div>
            )}
            {reservation.status === 'pending' && (
              <div className="text-center">
                <p className="text-xs text-white/60 mb-1">距离开始</p>
                <p className="text-2xl font-mono font-bold text-white tracking-wider">{formatCountdown(remainingTime)}</p>
              </div>
            )}
          </div>

          <div className="p-6">
             <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-400 mb-1">席位详情</p>
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <h2 className="text-2xl font-bold text-gray-900">{reservation.seat.seatNumber}</h2>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                      {reservation.seat.zone.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{reservation.seat.zone.floor}层 · {reservation.seat.zone.description || "综合阅览区"}</p>
                </div>
                
                <div className="h-12 w-px bg-gray-100 hidden md:block" />
                
                <div className="text-center md:text-right">
                   <p className="text-sm text-gray-400 mb-1">预约时段</p>
                   <div className="text-lg font-medium text-gray-900">
                     {formatTime(reservation.startTime)}
                     <span className="mx-2 text-gray-300">-</span>
                     {formatTime(reservation.endTime)}
                   </div>
                   <p className="text-sm text-gray-500 mt-1">
                     {formatDate(reservation.startTime)}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">所在区域</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {reservation.seat.zone.name} {reservation.seat.zone.floor}楼
                  <br />
                  席位编号: {reservation.seat.seatNumber}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-start gap-4">
               <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">预约人</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {reservation.user.name}
                  <br />
                  <span className="font-mono text-xs">{reservation.user.studentId}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* QR Code Section */}
        {(reservation.status === 'active' || reservation.status === 'pending') && (
           <Card className="border-gray-100 shadow-sm mb-8 overflow-hidden">
             <div className="bg-gray-900 p-6 flex items-center justify-between text-white">
                <div>
                   <h3 className="font-medium mb-1">签到二维码</h3>
                   <p className="text-sm text-gray-400">扫描此二维码完成签到</p>
                </div>
                <QrCode className="h-8 w-8 opacity-80" />
             </div>
             <CardContent className="p-8 flex justify-center bg-white">
                {qrCode ? (
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-inner">
                    <Image
                      src={qrCode}
                      alt="签到二维码"
                      width={256}
                      height={256}
                      className="h-64 w-64 rounded-lg"
                      unoptimized
                    />
                    <p className="text-xs text-gray-400 text-center mt-3 font-mono">#{reservation.id}</p>
                  </div>
                ) : (
                  <div className="bg-white p-2 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="h-48 w-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-4">
                      正在生成二维码...
                    </div>
                  </div>
                )}
             </CardContent>
           </Card>
        )}

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:relative md:bg-transparent md:border-0 md:p-0 z-20">
           <div className="container mx-auto max-w-2xl flex flex-col gap-3">
	             {reservation.status === 'pending' && (
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg font-medium rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 shadow-xl shadow-gray-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => handleAction('checkin')}
                      disabled={!checkinAvailability.allowed || actionLoading}
                    >
                      <MapPin className="mr-2 h-5 w-5" />
                      {checkinAvailability.allowed ? "确认签到" : "暂不可签到"}
                    </Button>
                    {!checkinAvailability.allowed && checkinAvailability.reason && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        {checkinAvailability.reason}
                      </p>
                    )}
                  </div>
	             )}
             
             {reservation.status === 'active' && (
                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg font-medium rounded-2xl bg-gray-900 hover:bg-black shadow-xl shadow-gray-900/20"
                  onClick={() => handleAction('finish')}
                >
                  <LogOutIcon className="mr-2 h-5 w-5" /> 释放席位
                </Button>
             )}

             {(reservation.status === 'pending' || reservation.status === 'active') && (
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full h-14 text-lg font-medium rounded-2xl border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-100"
                  onClick={() => handleAction('cancel')}
                >
                  取消本次预约
                </Button>
             )}
           </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.action}
        loading={actionLoading}
      />
    </div>
  );
}
