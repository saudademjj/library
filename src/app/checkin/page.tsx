"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  ArrowRight
} from "lucide-react";
import { formatTime } from "@/lib/datetime";
import type { ReservationResponse } from "@/lib/types";
import { useStore } from "@/lib/store";

// 禁用静态生成，因为此页面依赖URL参数
export const dynamic = 'force-dynamic';

function CheckinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { invalidateReservations } = useStore();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);

  const reservationId = searchParams.get("reservationId");

  useEffect(() => {
    let isMounted = true; // 防止组件卸载后setState

    if (!reservationId) {
      if (isMounted) {
        setError("签到链接无效");
        setLoading(false);
      }
      return;
    }

    const handleCheckin = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (isMounted) {
            setError("请先登录");
            setLoading(false);
          }
          setTimeout(() => {
            if (isMounted) router.replace("/login");
          }, 2000);
          return;
        }

        // 先获取预约详情
        const resResponse = await fetch(`/api/reservations/${reservationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const resData = await resResponse.json();
        if (!resData.ok) {
          if (isMounted) {
            setError(resData.error || "预约不存在");
            setLoading(false);
          }
          return;
        }

        if (isMounted) setReservation(resData.data);

        // 如果已经是active状态，直接显示成功
        if (resData.data.status === 'active') {
          if (isMounted) {
            setSuccess(true);
            invalidateReservations();
            setLoading(false);
          }
          return;
        }

        // 如果不是pending状态，不能签到
        if (resData.data.status !== 'pending') {
          if (isMounted) {
            setError("此预约无需签到");
            setLoading(false);
          }
          return;
        }

        // 执行签到
        const checkinResponse = await fetch(`/api/reservations/${reservationId}/checkin`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        const checkinData = await checkinResponse.json();
        if (isMounted) {
          if (checkinData.ok) {
            setSuccess(true);
            invalidateReservations();
            toast.success("签到成功！");
          } else {
            setError(checkinData.error || "签到失败");
            toast.error(checkinData.error || "签到失败");
          }
        }
      } catch (err) {
        console.error("签到错误:", err);
        if (isMounted) {
          setError("网络错误，请稍后重试");
          toast.error("网络错误");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    handleCheckin();

    // 清理函数：组件卸载时设置标志
    return () => {
      isMounted = false;
    };
  }, [invalidateReservations, reservationId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-200 shadow-2xl">
        <CardContent className="p-8">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-gray-900" />
              <h2 className="text-xl font-semibold text-gray-900">正在签到...</h2>
              <p className="text-sm text-gray-500">请稍候</p>
            </div>
          )}

          {!loading && success && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">签到成功！</h2>
              <p className="text-gray-600 text-center">
                您已成功签到，开始专注时光吧！
              </p>

              {reservation && (
                <div className="w-full mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{reservation.seat?.seatNumber} 座</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {reservation.seat?.zone?.name} · {reservation.seat?.zone?.floor}层
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    {formatTime(reservation.startTime)}
                    {' - '}
                    {formatTime(reservation.endTime)}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 w-full mt-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => router.push(`/reservations/${reservationId}`)}
                >
                  查看详情 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push("/reservations")}
                >
                  返回预约列表
                </Button>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">签到失败</h2>
              <p className="text-gray-600 text-center">{error}</p>

              <div className="flex flex-col gap-2 w-full mt-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push("/reservations")}
                >
                  返回预约列表
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-gray-200 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-gray-900" />
              <h2 className="text-xl font-semibold text-gray-900">加载中...</h2>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <CheckinContent />
    </Suspense>
  );
}
