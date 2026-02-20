"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResetUrl("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (data.ok) {
        setSuccess(data.message || "若邮箱已注册，重置指引将发送到该邮箱");
        setResetUrl(data?.data?.resetUrl || "");
      } else {
        setError(data.error || "提交失败，请稍后重试");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-xl p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登录
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">重置密码</h1>
        <p className="text-sm text-gray-500 mb-6">
          输入注册邮箱，我们将发送重置指引。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="email"
              placeholder="name@example.com"
              className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>
          )}

          {success && (
            <div className="space-y-3 rounded-xl bg-green-50 text-green-700 text-sm px-3 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{success}</span>
              </div>
              {resetUrl && (
                <div className="rounded-lg bg-white/80 border border-green-100 px-3 py-2">
                  <p className="text-xs text-green-700 mb-2">
                    演示环境可直接跳转重置密码：
                  </p>
                  <a
                    href={resetUrl}
                    className="inline-flex items-center text-xs font-semibold text-green-800 hover:underline break-all"
                  >
                    前往重置页面
                  </a>
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-gray-900 hover:bg-black text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              "发送重置指引"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
