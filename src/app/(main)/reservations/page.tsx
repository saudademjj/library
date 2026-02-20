"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle2,
  History,
  XCircle,
  ChevronRight,
  RefreshCw,
  Search,
  CircleSlash,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { formatTime, formatDateTime } from "@/lib/datetime";
import { useStore } from "@/lib/store";

type ReservationStatusFilter =
  | "all"
  | "ongoing"
  | "history"
  | "active"
  | "pending"
  | "completed"
  | "cancelled";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  action: () => Promise<void>;
  variant: "default" | "danger";
}

const FILTER_OPTIONS: Array<{ key: ReservationStatusFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "ongoing", label: "进行中" },
  { key: "history", label: "历史" },
  { key: "pending", label: "待签到" },
  { key: "active", label: "履约中" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
];

const RESERVATION_AUTO_REFRESH_MS = 15000;

function matchesStatusFilter(status: string, filter: ReservationStatusFilter) {
  switch (filter) {
    case "all":
      return true;
    case "ongoing":
      return status === "active" || status === "pending";
    case "history":
      return status === "completed" || status === "cancelled";
    default:
      return status === filter;
  }
}

export default function ReservationsPage() {
  const router = useRouter();
  const {
    reservations,
    setReservations,
    invalidateReservations,
    isFresh,
    lastReservationsFetch,
  } = useStore();

  const [loading, setLoading] = useState(reservations.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReservationStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    confirmText: "确定",
    cancelText: "取消",
    action: async () => {},
    variant: "default",
  });

  const fetchReservations = useCallback(
    async ({ force = false, silent = false }: { force?: boolean; silent?: boolean } = {}) => {
      if (reservations.length > 0) {
        setLoading(false);
      }

      if (!force && isFresh(lastReservationsFetch) && reservations.length > 0) {
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.replace("/login");
          return;
        }

        const response = await fetch("/api/reservations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.ok) {
          setReservations(data.data);
        } else if (response.status === 401) {
          router.replace("/login");
        } else if (force && !silent) {
          toast.error(data.error || "刷新预约失败");
        }
      } catch (error) {
        console.error("加载预约失败:", error);
        if (force && !silent) {
          toast.error("网络错误，刷新失败");
        }
      } finally {
        setLoading(false);
      }
    },
    [isFresh, lastReservationsFetch, reservations.length, router, setReservations],
  );

  useEffect(() => {
    void fetchReservations({ force: true, silent: true });
  }, [fetchReservations]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void fetchReservations({ force: true, silent: true });
    };

    const refreshOnFocus = () => {
      void fetchReservations({ force: true, silent: true });
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [fetchReservations]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchReservations({ force: true, silent: true });
    }, RESERVATION_AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [fetchReservations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReservations({ force: true });
    setRefreshing(false);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmDialog({
      open: true,
      title: "确认删除记录",
      description: "删除后无法恢复，该预约记录将永久移除。",
      confirmText: "删除记录",
      cancelText: "再想想",
      variant: "danger",
      action: async () => {
        setActionLoading(true);
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`/api/reservations/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await response.json();
          if (data.ok) {
            setRemovingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
            toast.success("记录已删除");
            invalidateReservations();

            await new Promise((resolve) => setTimeout(resolve, 260));
            await fetchReservations({ force: true, silent: true });
          } else {
            throw new Error(data.error || "删除失败");
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "删除失败");
          throw error;
        } finally {
          setActionLoading(false);
          setRemovingIds((prev) => prev.filter((item) => item !== id));
        }
      },
    });
  };

  const handleCancel = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmDialog({
      open: true,
      title: "确认取消预约",
      description: "该预约会立即释放座位，并进入历史记录。",
      confirmText: "确认取消",
      cancelText: "保留预约",
      variant: "danger",
      action: async () => {
        setActionLoading(true);
        try {
          const targetReservation = reservations.find((item) => item.id === id);
          if (
            !targetReservation ||
            (targetReservation.status !== "active" && targetReservation.status !== "pending")
          ) {
            toast.info("该预约状态已变更，请刷新后重试");
            await fetchReservations({ force: true, silent: true });
            return;
          }

          const token = localStorage.getItem("token");
          const response = await fetch(`/api/reservations/${id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (!data.ok) {
            if (data.error === "只能取消进行中或待签到的预约") {
              toast.info("该预约已不在可取消状态，列表已自动更新");
              await fetchReservations({ force: true, silent: true });
              return;
            }
            throw new Error(data.error || "取消失败");
          }

          toast.success("预约已取消");
          invalidateReservations();
          await fetchReservations({ force: true, silent: true });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "取消失败");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const filteredReservations = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return reservations.filter((reservation) => {
      if (!matchesStatusFilter(reservation.status, statusFilter)) return false;

      if (!keyword) return true;

      const seatNumber = reservation.seat?.seatNumber?.toLowerCase() || "";
      const zoneName = reservation.seat?.zone?.name?.toLowerCase() || "";
      const reservationId = String(reservation.id);

      return (
        seatNumber.includes(keyword) ||
        zoneName.includes(keyword) ||
        reservationId.includes(keyword)
      );
    });
  }, [reservations, searchQuery, statusFilter]);

  const activeList = filteredReservations.filter(
    (item) => item.status === "active" || item.status === "pending",
  );
  const historyList = filteredReservations.filter(
    (item) => item.status !== "active" && item.status !== "pending",
  );

  const statusCounts = useMemo(() => {
    const active = reservations.filter((item) => item.status === "active").length;
    const pending = reservations.filter((item) => item.status === "pending").length;
    const completed = reservations.filter((item) => item.status === "completed").length;
    const cancelled = reservations.filter((item) => item.status === "cancelled").length;

    return {
      all: reservations.length,
      ongoing: active + pending,
      history: completed + cancelled,
      active,
      pending,
      completed,
      cancelled,
    };
  }, [reservations]);

  const formatFullDate = (date: string) => formatDateTime(date);
  const formatReservationCode = (id: number) => String(id).padStart(4, "0");

  if (loading && reservations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-24 w-24 bg-white border border-gray-100 rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <Calendar className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">尚无预约行程</h3>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
              探索馆内空间，开启专注时光。点击下方按钮即可开始选座。
            </p>
            <Link href="/seats">
              <Button size="lg" className="bg-gray-900 text-white hover:bg-gray-800 px-8 rounded-full shadow-lg hover:shadow-xl transition-all">
                即刻探索
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="搜索座位号、区域名或预约 ID"
                    className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-gray-300 focus:bg-white transition-colors"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  className="h-10 rounded-xl border-gray-200 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                  刷新
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((option) => {
                  const isActive = statusFilter === option.key;
                  const count = statusCounts[option.key];
                  return (
                    <button
                      key={option.key}
                      onClick={() => setStatusFilter(option.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                        isActive
                          ? "bg-gray-900 text-white shadow-md shadow-gray-900/20"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                      )}
                    >
                      <span>{option.label}</span>
                      <span className={cn("tabular-nums", isActive ? "text-gray-200" : "text-gray-400")}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {filteredReservations.length === 0 ? (
              <section className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
                <CircleSlash className="h-9 w-9 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900">没有匹配的预约</h3>
                <p className="text-sm text-gray-500 mt-1">尝试切换筛选条件或修改搜索关键字。</p>
              </section>
            ) : (
              <div className="space-y-10">
                {activeList.length > 0 && (
                  <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 px-1">
                      <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <h2 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">
                        当前行程
                      </h2>
                    </div>
                    <div className="grid gap-4">
                      {activeList.map((reservation) => (
                        <Link href={`/reservations/${reservation.id}`} key={reservation.id} className="block group">
                          <Card className="border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden relative">
                            <CardContent className="p-0">
                              <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
                                <div className="flex flex-col justify-center min-w-[100px] border-b sm:border-b-0 sm:border-r border-gray-100 pb-4 sm:pb-0 sm:pr-6">
                                  <span className="text-sm text-gray-400 font-medium">
                                    {formatFullDate(reservation.startTime)}
                                  </span>
                                  <div className="text-2xl font-bold text-gray-900 mt-1">
                                    {formatTime(reservation.startTime)}
                                  </div>
                                  <span className="text-xs text-gray-400 mt-1">
                                    至 {formatTime(reservation.endTime)}
                                  </span>
                                </div>

                                <div className="flex-1 flex flex-col justify-center">
                                  <div className="mb-3 flex items-center">
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "inline-flex h-8 min-w-[84px] items-center justify-center rounded-full border px-3 text-[11px] font-semibold tracking-[0.08em]",
                                        reservation.status === "active"
                                          ? "bg-green-50 text-green-700 border-green-100"
                                          : "bg-amber-50 text-amber-700 border-amber-100",
                                      )}
                                    >
                                      {reservation.status === "active" ? "履约中" : "待签到"}
                                    </Badge>
                                  </div>

                                  <h3 className="text-xl font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                    {reservation.seat?.seatNumber} 座
                                  </h3>

                                  <div className="flex items-center text-sm text-gray-500">
                                    <MapPin className="h-3.5 w-3.5 mr-1" />
                                    {reservation.seat?.zone?.name} · {reservation.seat?.zone?.floor}层
                                  </div>
                                </div>

                                <div className="flex w-full items-center justify-between gap-2.5 sm:w-auto sm:min-w-[228px] sm:flex-col sm:items-end sm:justify-center sm:gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-8 min-w-[98px] items-center justify-center rounded-full border border-gray-200/90 bg-gray-50 px-3 text-[12px] font-semibold text-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                                      <span className="mr-1 text-[10px] text-gray-400">#</span>
                                      <span className="tabular-nums tracking-[0.12em] text-gray-600">
                                        {formatReservationCode(reservation.id)}
                                      </span>
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(event) => handleCancel(reservation.id, event)}
                                      className="h-8 min-w-[104px] rounded-full border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 shadow-[0_1px_2px_rgba(239,68,68,0.12)] transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                      取消预约
                                    </Button>
                                  </div>
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all group-hover:border-gray-300 group-hover:bg-gray-50 group-hover:text-gray-700">
                                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                  </div>
                                </div>
                              </div>

                              {reservation.status === "active" && (
                                <div className="h-1 w-full bg-gray-100">
                                  <div className="h-full bg-green-500 w-1/3 animate-pulse" />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {historyList.length > 0 && (
                  <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-2 px-1">
                      <History className="h-4 w-4 text-gray-400" />
                      <h2 className="text-sm font-semibold text-gray-500 tracking-wide uppercase">
                        过往足迹
                      </h2>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="divide-y divide-gray-50">
                        {historyList.map((reservation) => (
                          <Link
                            href={`/reservations/${reservation.id}`}
                            key={reservation.id}
                            className={cn(
                              "block hover:bg-gray-50/80 transition-colors",
                              removingIds.includes(reservation.id) && "reservation-row-removing",
                            )}
                          >
                            <div className="p-4 sm:px-6 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center border",
                                    reservation.status === "completed"
                                      ? "bg-blue-50 border-blue-100 text-blue-600"
                                      : "bg-gray-50 border-gray-100 text-gray-400",
                                  )}
                                >
                                  {reservation.status === "completed" ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <XCircle className="h-5 w-5" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {reservation.seat?.seatNumber || `座位 ${reservation.seatId}`}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {formatFullDate(reservation.startTime)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)} ·{" "}
                                    {reservation.seat?.zone?.name}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "border-0 bg-transparent font-normal",
                                    reservation.status === "completed"
                                      ? "text-blue-600"
                                      : "text-gray-400",
                                  )}
                                >
                                  {reservation.status === "completed" ? "已结束" : "已取消"}
                                </Badge>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(event) => handleDelete(reservation.id, event)}
                                  className="h-8 w-8 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.action}
        loading={actionLoading}
      />
    </div>
  );
}
