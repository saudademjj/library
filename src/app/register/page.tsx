"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { setStoredAuth } from "@/lib/client-auth";
import { useStore } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.ok) {
        setStoredAuth(data.data.token, data.data.user);
        setUser(data.data.user);
        router.replace("/dashboard");
      } else {
        setError(data.error || "注册失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* 左侧品牌区 - 仅在大屏显示 */}
      <div className="hidden lg:flex w-1/2 bg-black relative items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop')" }}
        />
        <div className="relative z-10 p-12 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-wide">Library</h1>
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            加入我们，<br/>共赴求知之旅。
          </h2>
          <p className="text-white/80 text-lg leading-relaxed">
            注册专属账号，随时随地预约心仪座位。
            记录每一次学习轨迹，畅享智慧图书馆服务。
          </p>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900">创建账号</h2>
            <p className="mt-2 text-sm text-gray-500">
              请填写以下信息完成注册
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="name">姓名</label>
                <Input
                  id="name"
                  name="name"
                  placeholder="张三"
                  className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="studentId">学号</label>
                <Input
                  id="studentId"
                  name="studentId"
                  placeholder="2024001"
                  className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="email">邮箱地址</label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="password">设置密码</label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="至少8位"
                className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="phone">手机号 (选填)</label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="13800138000"
                className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white transition-all mt-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  立即注册 <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-500">
            已有账号?{" "}
            <Link href="/login" className="font-medium text-gray-900 hover:underline">
              直接登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
