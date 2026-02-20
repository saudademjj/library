"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Clock, Award, TrendingUp, User } from "lucide-react";
import type { LeaderboardPeriod, LeaderboardResponse } from "@/lib/types";

interface LeaderboardProps {
    className?: string;
}

const periodLabels: Record<LeaderboardPeriod, string> = {
    today: "今日",
    week: "本周",
    month: "本月",
    all: "总榜",
};

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours}小时`;
    }
    return `${hours}小时${mins}分`;
}

// 获取排名对应的样式
function getRankStyle(rank: number): { bg: string; text: string; border: string; shadow: string } {
    switch (rank) {
        case 1:
            return {
                bg: "bg-gradient-to-r from-amber-400 to-yellow-300",
                text: "text-amber-900",
                border: "border-amber-200",
                shadow: "shadow-amber-200/50",
            };
        case 2:
            return {
                bg: "bg-gradient-to-r from-gray-300 to-slate-200",
                text: "text-gray-700",
                border: "border-gray-200",
                shadow: "shadow-gray-200/50",
            };
        case 3:
            return {
                bg: "bg-gradient-to-r from-amber-600 to-orange-400",
                text: "text-amber-50",
                border: "border-orange-200",
                shadow: "shadow-orange-200/50",
            };
        default:
            return {
                bg: "bg-gray-100",
                text: "text-gray-600",
                border: "border-gray-100",
                shadow: "",
            };
    }
}

export default function Leaderboard({ className }: LeaderboardProps) {
    const [period, setPeriod] = useState<LeaderboardPeriod>("week");
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem("token");
                const headers: Record<string, string> = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }

                const res = await fetch(`/api/leaderboard?period=${period}&limit=10`, { headers });
                const json = await res.json();
                if (json.ok) {
                    setData(json.data);
                } else {
                    setError(json.error || "加载排行榜失败");
                }
            } catch (e) {
                console.error("获取排行榜失败", e);
                setError("网络异常，排行榜加载失败");
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [period]);

    return (
        <div className={cn("bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-900/5 overflow-hidden", className)}>
            {/* Header */}
            <div className="p-8 pb-6 border-b border-gray-50">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-900 p-3 rounded-2xl shadow-lg shadow-gray-900/20">
                            <Trophy className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-gray-900 uppercase">学习排行榜</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5">STUDY LEADERBOARD</p>
                        </div>
                    </div>
                </div>

                {/* Period Tabs */}
                <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl">
                    {(Object.keys(periodLabels) as LeaderboardPeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300",
                                period === p
                                    ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                            )}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rankings List */}
            <div className="p-6">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                <div className="h-10 w-10 rounded-xl bg-gray-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-24 bg-gray-100 rounded" />
                                    <div className="h-3 w-16 bg-gray-50 rounded" />
                                </div>
                                <div className="h-4 w-16 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-sm font-semibold text-red-500">{error}</p>
                    </div>
                ) : data?.rankings && data.rankings.length > 0 ? (
                    <div className="space-y-3">
                        {data.rankings.map((entry) => {
                            const rankStyle = getRankStyle(entry.rank);
                            const isTopThree = entry.rank <= 3;

                            return (
                                <div
                                    key={entry.userId}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 group",
                                        isTopThree ? "bg-gradient-to-r from-gray-50 to-white border border-gray-100 shadow-sm hover:shadow-md" : "hover:bg-gray-50"
                                    )}
                                >
                                    {/* Rank Badge */}
                                    <div
                                        className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110",
                                            rankStyle.bg,
                                            rankStyle.text,
                                            isTopThree ? `shadow-lg ${rankStyle.shadow}` : ""
                                        )}
                                    >
                                        {entry.rank}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 truncate">{entry.name}</span>
                                            {entry.rank === 1 && (
                                                <Award className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {entry.studentId}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right">
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="font-black text-gray-900 tabular-nums">
                                                {formatDuration(entry.totalMinutes)}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {entry.reservationCount} 次预约
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="bg-gray-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">暂无排行数据</p>
                        <p className="text-xs text-gray-300 mt-1">完成学习后即可上榜</p>
                    </div>
                )}
            </div>

            {/* My Rank */}
            {data?.myRank && (
                <div className="border-t border-gray-100 p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-blue-100 shadow-sm">
                        {/* My Rank Badge */}
                        <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-200">
                            <User className="h-5 w-5 text-white" />
                        </div>

                        {/* My Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">我的排名</span>
                                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                    第 {data.myRank.rank} 名
                                </span>
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {data.myRank.name}
                            </div>
                        </div>

                        {/* My Stats */}
                        <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                                <Clock className="h-3.5 w-3.5 text-blue-400" />
                                <span className="font-black text-blue-600 tabular-nums">
                                    {formatDuration(data.myRank.totalMinutes)}
                                </span>
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {data.myRank.reservationCount} 次预约
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
