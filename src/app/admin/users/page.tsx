"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface User {
  id: number;
  name: string;
  email: string;
  studentId: string;
  phone: string | null;
  role: "admin" | "student";
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", description: "", action: async () => { } });

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        u.studentId.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower)
      ));
    }
  }, [searchTerm, users]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setUsers(data.data);
        setFilteredUsers(data.data);
      }
    } catch (error) {
      console.error("加载用户失败:", error);
      toast.error("加载用户失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = (userId: number, currentStatus: boolean) => {
    setConfirmDialog({
      open: true,
      title: `确认${currentStatus ? "禁用" : "启用"}用户`,
      description: `确定要${currentStatus ? "禁用" : "启用"}该用户吗？`,
      action: async () => {
        const token = localStorage.getItem("token");
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isActive: !currentStatus }),
          });

          const data = await response.json();
          if (data.ok) {
            toast.success(`用户已${currentStatus ? "禁用" : "启用"}`);
            loadUsers();
          } else {
            toast.error(data.error || "操作失败");
          }
        } catch {
          toast.error("操作失败，请稍后重试");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索姓名、学号或邮箱..."
            className="pl-10 border-gray-200 bg-gray-50 focus:bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500 sm:text-right">
          共 {filteredUsers.length} 位用户
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 text-center text-gray-400">没有找到匹配的用户</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">基本信息</th>
                  <th className="px-6 py-3 font-medium">联系方式</th>
                  <th className="px-6 py-3 font-medium">角色</th>
                  <th className="px-6 py-3 font-medium">状态</th>
                  <th className="px-6 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">学号: {user.studentId}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-gray-700">{user.email}</div>
                      <div className="text-xs text-gray-500">{user.phone || "-"}</div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={user.role === "admin" ? "default" : "outline"} className={user.role === "admin" ? "bg-purple-600" : ""}>
                        {user.role === "admin" ? "管理员" : "学生"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={user.isActive ? "outline" : "destructive"} className={user.isActive ? "text-green-600 border-green-200 bg-green-50" : ""}>
                        {user.isActive ? "正常" : "封禁"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {user.role !== "admin" && (
                        <Button
                          variant={user.isActive ? "ghost" : "default"}
                          size="sm"
                          className={user.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "bg-green-600 hover:bg-green-700"}
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                        >
                          {user.isActive ? "禁用" : "启用"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.action}
      />
    </div>
  );
}
