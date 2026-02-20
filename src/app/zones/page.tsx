"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Layers, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Zone {
  id: number;
  name: string;
  floor: number;
  description: string | null;
  isActive: boolean;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/zones");
      const data = await response.json();
      if (data.ok) {
        setZones(data.data);
      } else {
        setError(data.error || "加载区域失败");
      }
    } catch (error) {
      console.error("加载区域失败:", error);
      setError("网络异常，暂时无法加载区域");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  // 按楼层分组并排序
  const zonesByFloor = zones.reduce((acc, zone) => {
    if (!acc[zone.floor]) {
      acc[zone.floor] = [];
    }
    acc[zone.floor].push(zone);
    return acc;
  }, {} as Record<number, Zone[]>);

  const floors = Object.keys(zonesByFloor)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
            <span className="sr-only">返回首页</span>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium">探索空间</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-light text-gray-900 mb-4">阅览区域分布</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            全馆共设有 {zones.length} 个特色区域，覆盖 {floors.length} 个楼层。
            <br />无论您需要安静独处还是小组协作，都能找到合适的位置。
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-400 animate-pulse">正在探索中...</div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="outline" onClick={() => void loadZones()}>
              重试加载
            </Button>
          </div>
        ) : zones.length === 0 ? (
          <div className="py-24 text-center text-gray-400">暂无区域数据</div>
        ) : (
          <div className="space-y-16">
            {floors.map((floor) => (
              <section key={floor} className="relative">
                {/* 楼层标记 */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                    {floor}F
                  </div>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {zonesByFloor[floor].map((zone) => {
                    const card = (
                      <div
                        className={`h-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all duration-300 relative overflow-hidden ${
                          zone.isActive
                            ? "hover:shadow-xl hover:border-gray-200 hover:-translate-y-1"
                            : "opacity-70 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                            <Layers className="h-6 w-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                          </div>
                          {zone.isActive ? (
                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-100">
                              开放中
                            </Badge>
                          ) : (
                            <Badge variant="secondary">维护中</Badge>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {zone.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6 line-clamp-2 h-10">
                          {zone.description || "暂无描述"}
                        </p>

                        <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-900 transition-colors pt-4 border-t border-gray-50">
                          {zone.isActive ? "前往选座" : "维护中暂不可进入"}
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    );

                    if (!zone.isActive) {
                      return <div key={zone.id} className="group block cursor-not-allowed">{card}</div>;
                    }

                    return (
                      <Link href={`/seats?zoneId=${zone.id}`} key={zone.id} className="group block">
                        {card}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
