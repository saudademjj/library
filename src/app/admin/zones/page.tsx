"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, LayoutDashboard } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Zone {
  id: number;
  name: string;
  floor: number;
  description: string | null;
  isActive: boolean;
}

export default function AdminZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    floor: 1,
    description: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", description: "", action: async () => { } });

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/zones");
      const data = await response.json();
      if (data.ok) {
        setZones(data.data);
      } else {
        toast.error(data.error || "加载区域失败");
      }
    } catch (error) {
      console.error("加载区域失败:", error);
      toast.error("加载区域失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const url = editingId ? `/api/zones/${editingId}` : "/api/zones";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success(editingId ? "区域更新成功" : "区域创建成功");
        loadZones();
        setShowForm(false);
        setFormData({ name: "", floor: 1, description: "" });
        setEditingId(null);
      } else {
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("操作失败，请稍后重试");
    }
  };

  const handleEdit = (zone: Zone) => {
    setFormData({
      name: zone.name,
      floor: zone.floor,
      description: zone.description || "",
    });
    setEditingId(zone.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      open: true,
      title: "确认删除区域",
      description: "确定要删除这个区域吗？这将影响该区域的所有座位。",
      action: async () => {
        const token = localStorage.getItem("token");
        try {
          const response = await fetch(`/api/zones/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();
          if (data.ok) {
            toast.success("区域已删除");
            loadZones();
          } else {
            toast.error(data.error || "删除失败");
          }
        } catch {
          toast.error("删除失败，请稍后重试");
        }
      },
    });
  };

  const handleToggleZoneStatus = (zone: Zone) => {
    const nextIsActive = !zone.isActive;
    setConfirmDialog({
      open: true,
      title: `${nextIsActive ? "启用" : "停用"}区域`,
      description: nextIsActive
        ? "启用后，用户可再次进入该区域选座。"
        : "停用后，用户将无法在该区域创建新预约。",
      action: async () => {
        const token = localStorage.getItem("token");
        try {
          const response = await fetch(`/api/zones/${zone.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isActive: nextIsActive }),
          });
          const data = await response.json();
          if (data.ok) {
            toast.success(nextIsActive ? "区域已启用" : "区域已停用");
            await loadZones();
          } else {
            toast.error(data.error || "更新区域状态失败");
          }
        } catch {
          toast.error("更新区域状态失败，请稍后重试");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">区域列表</h2>
          <p className="text-sm text-gray-500">管理图书馆的所有阅览空间</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-gray-900 text-white hover:bg-gray-800">
          <Plus className="mr-2 h-4 w-4" />
          新建区域
        </Button>
      </div>

      {showForm && (
        <Card className="border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>{editingId ? "编辑区域" : "新建区域"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">区域名称</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：A区 - 安静学习区"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">楼层</label>
                  <Input
                    type="number"
                    value={formData.floor}
                    onChange={(e) =>
                      setFormData({ ...formData, floor: parseInt(e.target.value) })
                    }
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="区域描述（可选）"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: "", floor: 1, description: "" });
                  }}
                >
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <Card key={zone.id} className="group hover:shadow-md transition-shadow border-gray-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900">{zone.name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">{zone.floor}F</span>
                      <span className="truncate max-w-[150px]">{zone.description}</span>
                    </CardDescription>
                  </div>
                  {zone.isActive ? (
                    <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">开放中</Badge>
                  ) : (
                    <Badge variant="secondary">已关闭</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <Link href={`/admin/zones/${zone.id}/design`} className="w-full">
                    <Button variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      布局设计 (可视化)
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-gray-200 hover:bg-gray-50" onClick={() => handleEdit(zone)}>
                      <Edit className="mr-2 h-4 w-4" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={zone.isActive ? "flex-1 border-amber-200 text-amber-700 hover:bg-amber-50" : "flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
                      onClick={() => handleToggleZoneStatus(zone)}
                    >
                      {zone.isActive ? "停用" : "启用"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none shadow-none"
                      onClick={() => handleDelete(zone.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
