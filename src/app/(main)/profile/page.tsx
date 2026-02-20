"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Mail, CreditCard, Loader2, Check, Clock, Target,
  Shield, Lock, Camera, GraduationCap, AlertCircle
} from "lucide-react";
import { useStore } from "@/lib/store";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user, setUser,
    userStats, setUserStats,
    isFresh, lastUserFetch, lastStatsFetch
  } = useStore();

  const [loading, setLoading] = useState(!user);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const loadProfile = useCallback(async () => {
    if (user && isFresh(lastUserFetch)) return;

    if (!user) setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.ok) {
        setUser(data.data);
      } else if (response.status === 401) {
        router.replace("/login");
      }
    } catch (error) {
      console.error("加载个人资料失败:", error);
      setError("加载个人资料失败");
    } finally {
      setLoading(false);
    }
  }, [isFresh, lastUserFetch, router, setUser, user]);

  const loadUserStats = useCallback(async () => {
    if (userStats && isFresh(lastStatsFetch)) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/leaderboard?period=all&limit=100", {
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
      toast.error("加载学习统计失败");
    }
  }, [isFresh, lastStatsFetch, setUserStats, userStats]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name,
        phone: user.phone || ""
      }));
    }
  }, [user]);
  
  useEffect(() => {
    void loadProfile();
    void loadUserStats();
  }, [loadProfile, loadUserStats]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const updateData: {
        name: string;
        phone: string | null;
        currentPassword?: string;
        newPassword?: string;
      } = {
        name: formData.name,
        phone: formData.phone || null
      };

      // 如果要修改密码
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setError("两次输入的新密码不一致");
          setSaving(false);
          return;
        }
        if (formData.newPassword.length < 6) {
          setError("新密码至少6个字符");
          setSaving(false);
          return;
        }
        if (!formData.currentPassword) {
          setError("请输入当前密码");
          setSaving(false);
          return;
        }
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (data.ok) {
        setSuccess(true);
        // 清空密码字段
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        // 重新加载个人资料
        await loadProfile();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "更新失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-gray-900 selection:text-white pb-20">
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-5xl">

        {/* 顶部标题区 */}
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-gray-900 mb-2 uppercase">
              个人中心
            </h1>
            <div className="flex items-center gap-3 text-gray-400">
              <div className="h-1 w-8 bg-gray-900 rounded-full"></div>
              <p className="text-xs font-bold uppercase tracking-[0.3em]">
                Student Profile & Settings
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* 左侧：学生证样式卡片 */}
          <div className="lg:col-span-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-xl shadow-gray-900/5 relative group transition-all duration-300 hover:shadow-gray-900/10 hover:-translate-y-1">
              
              {/* 顶部装饰背景 - 精致的深色纹理 */}
              <div className="h-32 bg-[#1a1a1a] w-full relative overflow-hidden">
                {/* 动态网格 */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>
                {/* 顶部光晕 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
              </div>

              <div className="px-8 pb-8 -mt-16 relative z-10 text-center">
                <div className="relative inline-block mb-4 group/avatar">
                  <div className="h-28 w-28 rounded-full bg-white p-2 shadow-xl mx-auto ring-1 ring-gray-100/50">
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl font-black text-gray-500 overflow-hidden border-4 border-white relative shadow-inner">
                      {user.name.charAt(0).toUpperCase()}
                      {/* 模拟光泽 */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-white rounded-full p-2 shadow-lg border border-gray-100 cursor-pointer hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all text-gray-400 group/cam">
                    <Camera className="h-4 w-4 group-hover/cam:scale-90 transition-transform" />
                  </div>
                </div>

                <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">{user.name}</h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold text-gray-600 mb-6 shadow-sm">
                  <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-mono tracking-tight">{user.studentId}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                  <div className="flex flex-col gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" /> 累计时长
                    </span>
                    <span className="text-xl font-bold text-gray-900 font-mono tracking-tight">
                       {userStats ? Math.floor(userStats.totalMinutes / 60) : 0}
                       <span className="text-xs font-medium text-gray-400 ml-1">h</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1">
                      <Target className="h-3 w-3" /> 排名
                    </span>
                    <span className="text-xl font-bold text-gray-900 font-mono tracking-tight">#{userStats?.rank || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 状态指示 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
               <div className="p-2.5 bg-green-50 rounded-xl text-green-600 shrink-0">
                 <Shield className="h-5 w-5" />
               </div>
               <div>
                 <h4 className="text-sm font-bold text-gray-900 mb-1">账户状态正常</h4>
                 <p className="text-xs text-gray-500 leading-relaxed font-medium">
                   您的图书馆通行证处于激活状态，可正常预约所有开放区域的座位。
                 </p>
               </div>
            </div>
          </div>

          {/* 右侧：资料编辑表单 */}
          <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <form onSubmit={handleUpdateProfile} className="space-y-8">
              {/* 基础信息 */}
              <div className="bg-white rounded-[32px] p-8 sm:p-10 border border-gray-100 shadow-xl shadow-gray-900/5 relative overflow-hidden">
                {/* 装饰圆点 */}
                <div className="absolute top-6 right-6 flex gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-gray-100"></div>
                   <div className="w-2 h-2 rounded-full bg-gray-100"></div>
                   <div className="w-2 h-2 rounded-full bg-gray-100"></div>
                </div>

                <div className="flex items-center gap-4 mb-8">
                   <div className="h-10 w-1.5 bg-gray-900 rounded-full shadow-sm"></div>
                   <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        基本信息
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 border-none font-bold">PROFILE</Badge>
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mt-1">请保持联系方式更新，以便接收预约通知</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                   <div className="space-y-2.5 group">
                      <Label htmlFor="name" className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-gray-900 transition-colors">姓名</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent rounded-xl transition-all font-medium shadow-sm"
                      />
                   </div>
                   <div className="space-y-2.5 group">
                      <Label htmlFor="phone" className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-gray-900 transition-colors">手机号码</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent rounded-xl transition-all font-medium shadow-sm"
                        placeholder="用于接收通知"
                      />
                   </div>
                   <div className="space-y-2.5">
                      <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">学号 (不可修改)</Label>
                      <div className="h-12 flex items-center px-4 bg-gray-50/50 rounded-xl border border-gray-100 text-gray-400 font-mono text-sm cursor-not-allowed">
                        <CreditCard className="h-4 w-4 mr-3 opacity-50" />
                        {user.studentId}
                      </div>
                   </div>
                   <div className="space-y-2.5">
                      <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">校园邮箱 (不可修改)</Label>
                      <div className="h-12 flex items-center px-4 bg-gray-50/50 rounded-xl border border-gray-100 text-gray-400 font-mono text-sm cursor-not-allowed">
                        <Mail className="h-4 w-4 mr-3 opacity-50" />
                        {user.email}
                      </div>
                   </div>
                </div>
              </div>

              {/* 安全设置 */}
              <div className="bg-white rounded-[32px] p-8 sm:p-10 border border-gray-100 shadow-xl shadow-gray-900/5">
                <div className="flex items-center gap-4 mb-8">
                   <div className="h-10 w-1.5 bg-amber-500 rounded-full shadow-sm shadow-amber-100"></div>
                   <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        安全设置
                        <Badge variant="secondary" className="bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 border-none font-bold">SECURITY</Badge>
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mt-1">定期修改密码以保护您的账户安全</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2.5 group">
                      <Label htmlFor="currentPassword" className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-amber-600 transition-colors">当前密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-4 h-4 w-4 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                        <Input
                          id="currentPassword"
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className="pl-11 h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all rounded-xl font-medium shadow-sm"
                          placeholder="修改密码时必填"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2.5 group">
                        <Label htmlFor="newPassword" className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-amber-600 transition-colors">新密码</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          className="h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all rounded-xl font-medium shadow-sm"
                          placeholder="至少6位字符"
                        />
                      </div>
                      <div className="space-y-2.5 group">
                        <Label htmlFor="confirmPassword" className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-amber-600 transition-colors">确认新密码</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all rounded-xl font-medium shadow-sm"
                          placeholder="再次输入"
                        />
                      </div>
                   </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-between">
                   <div className="text-sm">
                      {success && (
                        <span className="text-green-600 flex items-center gap-2 font-bold animate-in fade-in bg-green-50 px-3 py-1.5 rounded-full">
                           <Check className="h-4 w-4" /> 修改成功
                        </span>
                      )}
                      {error && (
                        <span className="text-red-600 flex items-center gap-2 font-bold animate-in fade-in bg-red-50 px-3 py-1.5 rounded-full">
                           <AlertCircle className="h-4 w-4" /> {error}
                        </span>
                      )}
                   </div>

                   <Button
                     type="submit"
                     className="bg-gray-900 hover:bg-black text-white px-8 h-12 rounded-xl font-bold text-sm shadow-lg shadow-gray-900/20 transition-all hover:scale-105 active:scale-95"
                     disabled={saving}
                   >
                     {saving ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         保存中...
                       </>
                     ) : (
                       "保存更改"
                     )}
                   </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
