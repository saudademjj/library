"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Layers, Zap, ShieldCheck, MapPin } from "lucide-react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("token")));
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    return () => window.removeEventListener("storage", syncAuthState);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col selection:bg-gray-900 selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="bg-gray-900 p-1.5 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Library.io</span>
          </div>
          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="default" className="rounded-xl px-6 font-bold uppercase tracking-widest text-[10px] bg-gray-900 hover:bg-black">
                  进入控制台
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                  登录
                </Link>
                <Link href="/register">
                  <Button variant="default" className="rounded-xl px-6 font-bold uppercase tracking-widest text-[10px] bg-gray-900 hover:bg-black shadow-lg shadow-gray-900/20 transition-all">
                    注册
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white py-24 sm:py-32">
          <div className="absolute inset-0 z-0 opacity-40">
            <div className="absolute top-0 right-0 h-[800px] w-[800px] rounded-full bg-gray-50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute bottom-0 left-0 h-[800px] w-[800px] rounded-full bg-blue-50/50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          </div>

          <div className="container relative z-10 mx-auto px-6 text-center">
            <div className="mx-auto max-w-4xl space-y-10">
              <div className="inline-flex items-center rounded-full border border-gray-100 bg-white/50 backdrop-blur-md px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 shadow-sm mb-4">
                <span className="flex h-2 w-2 rounded-full bg-green-500 mr-3 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                Next-Gen Library Experience
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-gray-900 sm:text-7xl lg:text-8xl uppercase leading-[0.9]">
                重塑你的 <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-400">
                  专注空间
                </span>
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto font-medium">
                不再因寻找座位而焦虑。借助实时可视化地图，精准锁定馆内每一处静谧角落。一键预约，即刻开启您的沉浸式学习之旅。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                  <Button size="lg" className="h-16 rounded-2xl px-10 text-lg font-black bg-gray-900 hover:bg-black text-white shadow-2xl shadow-gray-900/20 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                    {isLoggedIn ? "进入控制台" : "立即体验"} 
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/zones">
                  <Button size="lg" variant="outline" className="h-16 rounded-2xl px-10 text-lg font-bold border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 uppercase tracking-widest transition-all">
                    <MapPin className="mr-3 h-5 w-5" />
                    探索地图
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-32 bg-gray-50/50">
          <div className="container mx-auto px-6">
            <div className="mb-24 flex flex-col items-center text-center">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">CAPABILITIES</h2>
              <h3 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-tight">
                为深度学习与 <br className="hidden sm:block" /> 高效管理而生
              </h3>
            </div>

            <div className="grid gap-12 md:grid-cols-3">
              {[
                {
                  icon: <Layers className="h-10 w-10 text-gray-900" />,
                  title: "全景交互地图",
                  desc: "高精度还原楼层平面，毫秒级状态实时同步。所见即所得，轻松定位心仪座位与电源插座。"
                },
                {
                  icon: <Zap className="h-10 w-10 text-gray-900" />,
                  title: "智能感知签到",
                  desc: "融合地理围栏与时效控制。座位状态实时流转，彻底根除无效占座，让资源利用更高效。"
                },
                {
                  icon: <ShieldCheck className="h-10 w-10 text-gray-900" />,
                  title: "公平调度机制",
                  desc: "内置信用评分与超时自动释放系统。保障每一位用户的公平使用权，最大化空间周转效率。"
                }
              ].map((feature, idx) => (
                <div key={idx} className="group relative flex flex-col items-start rounded-[40px] bg-white p-10 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-gray-900/5 hover:-translate-y-2">
                  <div className="mb-8 inline-block rounded-3xl bg-gray-50 p-5 group-hover:bg-gray-900 group-hover:text-white transition-all duration-500">
                    {feature.icon}
                  </div>
                  <h4 className="mb-4 text-2xl font-black text-gray-900 tracking-tight uppercase">{feature.title}</h4>
                  <p className="text-gray-400 font-medium leading-relaxed group-hover:text-gray-500 transition-colors">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-gray-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter mb-8 uppercase leading-none">READY TO START?</h2>
            <p className="text-xl text-gray-400 mb-12 max-w-xl mx-auto font-medium">
              加入数千名同学的行列，让每一次图书馆之旅都从容自如。
            </p>
            <Link href="/register">
              <Button size="lg" className="h-16 rounded-2xl px-12 text-lg font-black bg-white text-gray-900 hover:bg-gray-100 shadow-2xl shadow-white/10 uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                立即注册账号
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-16">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <BookOpen className="h-4 w-4 text-gray-400" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Library.io</span>
          </div>
          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">
            © 2026 LIBRARY SEAT RESERVATION SYSTEM. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
