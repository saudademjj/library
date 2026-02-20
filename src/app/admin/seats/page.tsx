"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Zone {
  id: number;
  name: string;
}

interface Seat {
  id: number;
  seatNumber: string;
  zoneId: number;
  isAvailable: boolean;
  x: number;
  y: number;
}

export default function AdminSeatsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", description: "", action: async () => { } });

  const loadZones = useCallback(async () => {
    try {
      const response = await fetch("/api/zones");
      const data = await response.json();
      if (data.ok) {
        setZones(data.data);
      }
    } catch (error) {
      console.error("加载区域失败:", error);
      toast.error("加载区域失败，请稍后重试");
    }
  }, []);

  const loadSeats = useCallback(async (zoneId?: number) => {
    setLoading(true);
    try {
      const url = zoneId ? `/api/seats?zoneId=${zoneId}` : "/api/seats";
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        setSeats(data.data);
      }
    } catch (error) {
      console.error("加载座位失败:", error);
      toast.error("加载座位失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadZones();
    void loadSeats();
  }, [loadSeats, loadZones]);

  useEffect(() => {
    void loadSeats(selectedZone || undefined);
  }, [loadSeats, selectedZone]);

  const handleDelete = (id: number) => {
    setConfirmDialog({
      open: true,
      title: "确认删除座位",
      description: "确定要删除这个座位吗？",
      action: async () => {
        const token = localStorage.getItem("token");
        try {
          const response = await fetch(`/api/seats/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();
          if (data.ok) {
            toast.success("座位已删除");
            loadSeats(selectedZone || undefined);
          } else {
            toast.error(data.error || "删除失败");
          }
        } catch {
          toast.error("删除失败，请稍后重试");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-blue-900">座位布局管理</h3>
          <p className="text-blue-700 mt-1">
            建议使用可视化的布局编辑器来添加、移动和管理座位，比在这里手动修改坐标更直观。
          </p>
        </div>
        <Link href="/admin/zones">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            前往区域列表选择编辑
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 py-4 overflow-x-auto">
        <Button
          variant={selectedZone === null ? "default" : "outline"}
          onClick={() => setSelectedZone(null)}
          className="whitespace-nowrap"
        >
          全部区域
        </Button>
        {zones.map((zone) => (
          <Button
            key={zone.id}
            variant={selectedZone === zone.id ? "default" : "outline"}
            onClick={() => setSelectedZone(zone.id)}
            className="whitespace-nowrap"
          >
            {zone.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">编号</th>
                  <th className="px-6 py-3 font-medium">所属区域</th>
                  <th className="px-6 py-3 font-medium">坐标 (x,y)</th>
                  <th className="px-6 py-3 font-medium">状态</th>
                  <th className="px-6 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {seats.map((seat) => (
                  <tr key={seat.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-medium text-gray-900">{seat.seatNumber}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {zones.find((z) => z.id === seat.zoneId)?.name}
                    </td>
                    <td className="px-6 py-3 text-gray-400 font-mono">
                      {seat.x}, {seat.y}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={seat.isAvailable ? "outline" : "secondary"} className={seat.isAvailable ? "text-green-600 border-green-200 bg-green-50" : ""}>
                        {seat.isAvailable ? "可用" : "停用"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(seat.id)}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {seats.length === 0 && (
            <div className="py-12 text-center text-gray-400">该区域暂无座位数据</div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="danger"
        onConfirm={confirmDialog.action}
      />
    </div>
  );
}
