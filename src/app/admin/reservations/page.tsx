"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatDateTime } from "@/lib/datetime";
import { Calendar, MapPin, RefreshCw, Search, User } from "lucide-react";

interface Reservation {
  id: number;
  seatId: number;
  userId: number;
  startTime: string;
  endTime: string;
  status: "pending" | "active" | "completed" | "cancelled";
  reservationType: "walk_in" | "advance";
  createdAt: string;
  seat?: {
    id: number;
    seatNumber: string;
    zoneId: number;
    zone?: {
      id: number;
      name: string;
      floor: number;
    };
  };
  user?: {
    id: number;
    name: string;
    studentId: string;
    email: string;
  };
}

type StatusFilter = "all" | "pending" | "active" | "completed" | "cancelled";

const FILTER_OPTIONS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待签到" },
  { key: "active", label: "进行中" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
];

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const loadReservations = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/reservations?pageSize=100", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setReservations(data.data);
      } else {
        toast.error(data.error || "加载预约失败");
      }
    } catch (error) {
      console.error("加载预约失败:", error);
      toast.error("网络异常，加载预约失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const statusCounts = useMemo(() => {
    return {
      all: reservations.length,
      pending: reservations.filter((item) => item.status === "pending").length,
      active: reservations.filter((item) => item.status === "active").length,
      completed: reservations.filter((item) => item.status === "completed").length,
      cancelled: reservations.filter((item) => item.status === "cancelled").length,
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return reservations.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }

      const fields = [
        String(item.id),
        item.user?.name || "",
        item.user?.studentId || "",
        item.user?.email || "",
        item.seat?.seatNumber || "",
        item.seat?.zone?.name || "",
      ];
      return fields.some((field) => field.toLowerCase().includes(keyword));
    });
  }, [reservations, searchQuery, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReservations({ silent: true });
    setRefreshing(false);
  };

  const handleUpdateStatus = (reservation: Reservation, nextStatus: Reservation["status"]) => {
    const statusLabelMap: Record<Reservation["status"], string> = {
      pending: "待签到",
      active: "进行中",
      completed: "已完成",
      cancelled: "已取消",
    };

    setConfirmDialog({
      open: true,
      title: "确认更新预约状态",
      description: `将预约 #${reservation.id} 的状态修改为「${statusLabelMap[nextStatus]}」？`,
      action: async () => {
        setActionLoading(true);
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`/api/reservations/${reservation.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: nextStatus }),
          });
          const data = await response.json();
          if (data.ok) {
            toast.success("预约状态已更新");
            await loadReservations({ silent: true });
          } else {
            toast.error(data.error || "更新失败");
            throw new Error(data.error || "更新失败");
          }
        } catch {
          throw new Error("更新失败");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const getStatusBadge = (status: Reservation["status"]) => {
    const variants = {
      pending: { label: "待签到", className: "bg-amber-50 text-amber-700 border-amber-100" },
      active: { label: "进行中", className: "bg-green-50 text-green-700 border-green-100" },
      completed: { label: "已完成", className: "bg-blue-50 text-blue-700 border-blue-100" },
      cancelled: { label: "已取消", className: "bg-gray-100 text-gray-600 border-gray-200" },
    } as const;
    return variants[status];
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索预约 ID、用户、学号、座位号、区域"
              className="pl-9 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="border-gray-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => {
            const active = statusFilter === option.key;
            const count = statusCounts[option.key];
            return (
              <button
                key={option.key}
                onClick={() => setStatusFilter(option.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span>{option.label}</span>
                <span className={active ? "text-gray-200" : "text-gray-400"}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : filteredReservations.length === 0 ? (
        <div className="py-12 text-center text-gray-400">没有匹配的预约记录</div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => {
            const statusInfo = getStatusBadge(reservation.status);
            return (
              <div key={reservation.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-gray-900">
                        预约 #{reservation.id} · {reservation.seat?.seatNumber || `座位 ${reservation.seatId}`}
                      </span>
                      <Badge variant="outline" className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {reservation.reservationType === "advance" ? "提前预约" : "即来即用"}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        <span>
                          {reservation.user?.name || `用户 #${reservation.userId}`} · {reservation.user?.studentId || "--"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {reservation.seat?.zone?.name || "未知区域"} · {reservation.seat?.zone?.floor || "-"}层
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {formatDateTime(reservation.startTime)} 至 {formatDateTime(reservation.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-col gap-2 md:items-end">
                    {reservation.status === "pending" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleUpdateStatus(reservation, "active")}
                      >
                        标记为进行中
                      </Button>
                    )}

                    {(reservation.status === "pending" || reservation.status === "active") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        onClick={() => handleUpdateStatus(reservation, "cancelled")}
                      >
                        取消预约
                      </Button>
                    )}

                    {(reservation.status === "active" || reservation.status === "pending") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                        onClick={() => handleUpdateStatus(reservation, "completed")}
                      >
                        标记为已完成
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="default"
        onConfirm={confirmDialog.action}
        loading={actionLoading}
      />
    </div>
  );
}
