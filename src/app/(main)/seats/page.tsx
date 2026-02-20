"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Search, Check, Plus, Minus, RotateCcw, Loader2, ArrowRight } from "lucide-react";
import SeatDetailPanel from "@/components/SeatDetailPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Link from "next/link";
import type { SeatType, SeatDisplayStatus, CreateReservationRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/datetime";
import { useStore } from "@/lib/store";

interface LayoutObject {
  id: string;
  type: "table" | "wall" | "window" | "door" | "plant" | "pillar";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
}

interface Seat {
  id: number;
  seatNumber: string;
  zoneId: number;
  isAvailable: boolean;
  x: number;
  y: number;
  rotation?: number;
  seatType?: SeatType;
  facilities?: string;
  note?: string;
  // 四色状态系统字段（必需）
  displayStatus: SeatDisplayStatus;
  availableUntil: string | null;
  nextReservationAt: string | null;
}

const SEAT_AUTO_REFRESH_MS = 12000;
type TouchPoint = { clientX: number; clientY: number };

export default function SeatsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">加载中...</div>}>
      <SeatsPage />
    </Suspense>
  );
}

function SeatsPage() {
  const router = useRouter();
  const {
    zones, setZones,
    seats: cachedSeats, setSeats: setCachedSeats,
    isFresh, lastZonesFetch, lastSeatsFetch,
    invalidateReservations
  } = useStore();

  const searchParams = useSearchParams();
  const initialZoneId = searchParams.get("zoneId") ? Number(searchParams.get("zoneId")) : null;

  const [seats, setSeats] = useState<Seat[]>([]);
  const [layoutObjects, setLayoutObjects] = useState<LayoutObject[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [showEmptyNotice, setShowEmptyNotice] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", description: "", action: async () => { } });

  // 地图交互状态
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const loadErrorToastRef = useRef({ zones: false, seats: false });
  const touchGestureRef = useRef<{
    mode: "none" | "pan" | "pinch";
    startX: number;
    startY: number;
    startTransform: { x: number; y: number; scale: number };
    startDistance: number;
    startMidpoint: { x: number; y: number };
    moved: boolean;
  }>({
    mode: "none",
    startX: 0,
    startY: 0,
    startTransform: { x: 0, y: 0, scale: 1 },
    startDistance: 0,
    startMidpoint: { x: 0, y: 0 },
    moved: false,
  });

  const selectedZoneInfo = useMemo(
    () => zones.find((z) => z.id === selectedZone),
    [selectedZone, zones]
  );
  const selectedSeatZone = useMemo(
    () => zones.find((z) => z.id === selectedSeat?.zoneId),
    [selectedSeat?.zoneId, zones]
  );
  const isSelectedZoneInactive = Boolean(selectedZoneInfo && !selectedZoneInfo.isActive);
  const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);
  const filteredSeats = useMemo(
    () =>
      seats.filter((seat) => {
        if (!normalizedQuery) return true;
        return seat.seatNumber.toLowerCase().includes(normalizedQuery);
      }),
    [normalizedQuery, seats]
  );
  const availableSeatCount = useMemo(
    () =>
      seats.filter(
        (seat) =>
          seat.isAvailable && (seat.displayStatus === "free" || seat.displayStatus === "limited"),
      ).length,
    [seats],
  );

  const loadZones = useCallback(async () => {
    // Check cache
    if (isFresh(lastZonesFetch) && zones.length > 0) {
      return;
    }
    try {
      const response = await fetch("/api/zones");
      const data = await response.json();
      if (data.ok) {
        setZones(data.data);
        loadErrorToastRef.current.zones = false;
      }
    } catch (error) {
      console.error("加载区域失败:", error);
      if (!loadErrorToastRef.current.zones) {
        toast.error("加载区域失败，请稍后重试");
        loadErrorToastRef.current.zones = true;
      }
    }
  }, [isFresh, lastZonesFetch, setZones, zones.length]);

  const loadSeats = useCallback(async (zoneId?: number, { force = false }: { force?: boolean } = {}) => {
    const key = zoneId || 0;

    // Instant cache display
    if (cachedSeats[key]) {
      setSeats(cachedSeats[key] as Seat[]);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Background fetch if stale
    if (!force && isFresh(lastSeatsFetch[key]) && cachedSeats[key]) {
      return;
    }

    try {
      const url = zoneId ? `/api/seats?zoneId=${zoneId}` : "/api/seats";
      const response = await fetch(url, {
        cache: force ? "no-store" : "default",
      });
      const data = await response.json();
      if (data.ok) {
        setSeats(data.data);
        setCachedSeats(key, data.data);
        loadErrorToastRef.current.seats = false;
      }
    } catch (error) {
      console.error("加载座位失败:", error);
      if (!loadErrorToastRef.current.seats) {
        toast.error("加载座位失败，请稍后重试");
        loadErrorToastRef.current.seats = true;
      }
    } finally {
      setLoading(false);
    }
  }, [cachedSeats, isFresh, lastSeatsFetch, setCachedSeats]);

  const getTouchDistance = (touchA: TouchPoint, touchB: TouchPoint) => {
    const dx = touchA.clientX - touchB.clientX;
    const dy = touchA.clientY - touchB.clientY;
    return Math.hypot(dx, dy);
  };

  const getTouchMidpoint = (touchA: TouchPoint, touchB: TouchPoint) => ({
    x: (touchA.clientX + touchB.clientX) / 2,
    y: (touchA.clientY + touchB.clientY) / 2,
  });

  const autoFit = useCallback(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (layoutObjects.length > 0) {
      layoutObjects.forEach(obj => {
        minX = Math.min(minX, obj.x);
        minY = Math.min(minY, obj.y);
        maxX = Math.max(maxX, obj.x + obj.width);
        maxY = Math.max(maxY, obj.y + obj.height);
      });
    }

    seats.forEach(seat => {
      minX = Math.min(minX, seat.x);
      minY = Math.min(minY, seat.y);
      maxX = Math.max(maxX, seat.x + 40);
      maxY = Math.max(maxY, seat.y + 40);
    });

    if (minX === Infinity) return;

    const padding = 80;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const sidebarWidth = selectedSeat ? 384 : 0;
    const containerWidth = Math.max(window.innerWidth - sidebarWidth - 100, 600);
    const containerHeight = 800;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1.2);

    const newX = (containerWidth - contentWidth * newScale) / 2 - minX * newScale;
    const newY = (containerHeight - contentHeight * newScale) / 2 - minY * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  }, [layoutObjects, seats, selectedSeat]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  // 监听 zones 加载完成，如果 URL 有 zoneId，则选中它
  useEffect(() => {
    if (zones.length > 0 && initialZoneId) {
      const zone = zones.find((z) => z.id === initialZoneId);
      if (zone?.isActive) {
        setSelectedZone(initialZoneId);
      } else if (zone && !zone.isActive) {
        toast.info("该区域当前维护中，暂不可进入选座");
      }
    }
  }, [zones, initialZoneId]);

  useEffect(() => {
    if (selectedZoneInfo?.isActive === false) {
      setSelectedZone(null);
      setSelectedSeat(null);
    }
  }, [selectedZoneInfo]);

  // 加载座位时也解析 layoutObjects
  useEffect(() => {
    if (selectedZone) {
      void loadSeats(selectedZone, { force: true });
      const currentZone = zones.find(z => z.id === selectedZone);
      if (currentZone?.layoutObjects) {
        try {
          // layoutObjects 可能已经是对象（从API解析后），也可能是字符串
          const parsed = typeof currentZone.layoutObjects === 'string'
            ? JSON.parse(currentZone.layoutObjects)
            : currentZone.layoutObjects;
          setLayoutObjects(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error("解析布局失败", e);
          setLayoutObjects([]);
        }
      } else {
        setLayoutObjects([]);
      }
    } else {
      void loadSeats(undefined, { force: true });
      setLayoutObjects([]);
    }
  }, [loadSeats, selectedZone, zones]);

  useEffect(() => {
    if (!selectedZone) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void loadSeats(selectedZone, { force: true });
    };

    const refreshOnFocus = () => {
      void loadSeats(selectedZone, { force: true });
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadSeats(selectedZone, { force: true });
    }, SEAT_AUTO_REFRESH_MS);

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadSeats, selectedZone]);

  // 切换区域时重置通知状态
  useEffect(() => {
    setShowEmptyNotice(true);
  }, [selectedZone]);

  // 自动适配视图
  useEffect(() => {
    if (seats.length > 0 || layoutObjects.length > 0) {
      autoFit();
    }
  }, [autoFit, layoutObjects.length, seats.length]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleSensitivity = 0.001;
    const delta = -e.deltaY * scaleSensitivity;
    const newScale = Math.min(Math.max(transform.scale + delta, 0.1), 4);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchGestureRef.current = {
        mode: "pan",
        startX: touch.clientX,
        startY: touch.clientY,
        startTransform: { ...transform },
        startDistance: 0,
        startMidpoint: { x: 0, y: 0 },
        moved: false,
      };
      return;
    }

    if (e.touches.length >= 2) {
      const touchA = e.touches[0];
      const touchB = e.touches[1];
      touchGestureRef.current = {
        mode: "pinch",
        startX: 0,
        startY: 0,
        startTransform: { ...transform },
        startDistance: getTouchDistance(touchA, touchB),
        startMidpoint: getTouchMidpoint(touchA, touchB),
        moved: false,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const gesture = touchGestureRef.current;
    if (gesture.mode === "none") return;

    if (gesture.mode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - gesture.startX;
      const dy = touch.clientY - gesture.startY;
      if (!gesture.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        gesture.moved = true;
      }
      setIsDragging(gesture.moved);
      setTransform({
        x: gesture.startTransform.x + dx,
        y: gesture.startTransform.y + dy,
        scale: gesture.startTransform.scale,
      });
      return;
    }

    if (gesture.mode === "pinch" && e.touches.length >= 2) {
      e.preventDefault();
      const touchA = e.touches[0];
      const touchB = e.touches[1];

      const currentDistance = getTouchDistance(touchA, touchB);
      const currentMidpoint = getTouchMidpoint(touchA, touchB);
      const scaleFactor = currentDistance / Math.max(gesture.startDistance, 1);
      const nextScale = Math.min(Math.max(gesture.startTransform.scale * scaleFactor, 0.1), 4);

      const worldX =
        (gesture.startMidpoint.x - gesture.startTransform.x) / gesture.startTransform.scale;
      const worldY =
        (gesture.startMidpoint.y - gesture.startTransform.y) / gesture.startTransform.scale;

      const panDx = currentMidpoint.x - gesture.startMidpoint.x;
      const panDy = currentMidpoint.y - gesture.startMidpoint.y;
      const nextX = currentMidpoint.x - worldX * nextScale + panDx;
      const nextY = currentMidpoint.y - worldY * nextScale + panDy;

      gesture.moved = true;
      setIsDragging(true);
      setTransform({
        x: nextX,
        y: nextY,
        scale: nextScale,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const gesture = touchGestureRef.current;

    if (e.touches.length === 0) {
      if (gesture.moved) {
        window.setTimeout(() => setIsDragging(false), 0);
      } else {
        setIsDragging(false);
      }
      touchGestureRef.current.mode = "none";
      return;
    }

    if (gesture.mode === "pinch" && e.touches.length === 1) {
      const touch = e.touches[0];
      touchGestureRef.current = {
        mode: "pan",
        startX: touch.clientX,
        startY: touch.clientY,
        startTransform: { ...transform },
        startDistance: 0,
        startMidpoint: { x: 0, y: 0 },
        moved: false,
      };
    }
  };

  const handleSeatClick = (seat: Seat) => {
    if (isSelectedZoneInactive) return;
    if (!seat.isAvailable) return;
    const token = localStorage.getItem("token");
    if (!token) {
      toast.warning("请先登录");
      router.replace("/login");
      return;
    }
    setSelectedSeat(seat);
  };

  const handleReserve = async (seatId: number, options?: Partial<CreateReservationRequest>) => {
    const token = localStorage.getItem("token");
    setReservationLoading(true);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Remove space
        },
        body: JSON.stringify({
          seatId,
          ...options
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setSelectedSeat(null);
        invalidateReservations();
        loadSeats(selectedZone || undefined, { force: true });
        setShowSuccessModal(true);
      } else {
        toast.error(data.error || "预约失败");
      }
    } catch {
      toast.error("预约失败，请稍后重试");
    } finally {
      setReservationLoading(false);
    }
  };

  const handleCancel = (reservationId: number) => {
    setConfirmDialog({
      open: true,
      title: "确认取消预约",
      description: "确定要取消这个预约吗？此操作无法撤销。",
      action: async () => {
        const token = localStorage.getItem("token");
        setReservationLoading(true);
        try {
          const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            }
          });
          const data = await response.json();
          if (data.ok) {
            toast.success("预约已取消");
            setSelectedSeat(null);
            invalidateReservations();
            loadSeats(selectedZone || undefined, { force: true });
          } else {
            toast.error(data.error || "取消失败");
          }
        } catch {
          toast.error("取消失败");
        } finally {
          setReservationLoading(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-7xl">
        {/* 区域筛选和搜索 */}
        <div className="mb-6 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4 flex-1">
            <h2 className="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-[0.2em]">筛选区域</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setSelectedZone(null)}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300",
                  selectedZone === null
                    ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20 scale-105"
                    : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200"
                )}
              >
                全馆概览
              </button>
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => {
                    if (!zone.isActive) {
                      toast.info("该区域维护中，暂不可预约");
                      return;
                    }
                    setSelectedZone(zone.id);
                  }}
                  disabled={!zone.isActive}
                  className={cn(
                    "px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300",
                    selectedZone === zone.id
                      ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20 scale-105"
                      : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-sm",
                    !zone.isActive && "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed hover:bg-gray-100 hover:shadow-none"
                  )}
                >
                  {zone.name}{!zone.isActive ? "（维护中）" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* 搜索框 */}
          {selectedZone && (
            <div className="relative w-full md:w-72 group animate-in slide-in-from-right-4 duration-500">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-gray-900" />
              <Input
                type="text"
                placeholder="输入座位编号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-white border-gray-200 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
              />
            </div>
          )}
        </div>

        {/* 内容区域 */}
        {!selectedZone ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => {
                  if (!zone.isActive) {
                    toast.info("该区域维护中，暂不可预约");
                    return;
                  }
                  setSelectedZone(zone.id);
                }}
                className={cn(
                  "group relative h-64 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-all text-left",
                  zone.isActive
                    ? "hover:border-gray-900/10 hover:shadow-2xl hover:shadow-gray-900/5 hover:-translate-y-1"
                    : "opacity-70 border-gray-200 cursor-not-allowed"
                )}
              >
                <div className="absolute top-0 right-0 p-32 bg-gray-50 rounded-full mix-blend-multiply filter blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                       <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 group-hover:bg-gray-900 group-hover:text-white transition-colors duration-500">
                          <MapPin className="h-5 w-5" />
                       </div>
                       <Badge variant="outline" className="rounded-full border-gray-200 text-gray-400 font-bold px-3">
                         {zone.floor}F
                       </Badge>
                       {!zone.isActive && (
                        <Badge variant="secondary" className="rounded-full font-bold px-3">
                          维护中
                        </Badge>
                       )}
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                      {zone.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100">
                      {zone.description || "实时掌握该区域空间动态，精准锁定理想席位。"}
                    </p>
                  </div>
                  
                  <div className="flex items-center text-xs font-black uppercase tracking-widest text-gray-300 group-hover:text-gray-900 transition-colors">
                    {zone.isActive ? "开启探索" : "暂不可用"}
                    <ArrowRight className="h-3 w-3 ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : loading ? (
          <div className="h-[400px] sm:h-[600px] flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl sm:rounded-3xl border-2 border-dashed border-gray-200">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-gray-300 mb-4" />
            <p className="text-xs sm:text-sm font-bold text-gray-400 tracking-widest uppercase">正在构建动态空间视图...</p>
          </div>
        ) : (
          <div className="relative h-full flex flex-col animate-in fade-in duration-500">
            {/* 地图容器 */}
            <div className="relative h-[500px] sm:h-[800px] w-full rounded-2xl sm:rounded-[40px] border border-gray-100 bg-white shadow-2xl shadow-gray-900/5 overflow-hidden flex flex-col sm:flex-row select-none">

              {/* 无需预约提示 */}
              {seats.length === 0 && layoutObjects.length > 0 && showEmptyNotice && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="bg-white border border-gray-100 shadow-2xl shadow-black/20 px-8 py-10 rounded-3xl text-center max-w-md mx-4 animate-in zoom-in-95 fade-in duration-300">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/10 animate-in zoom-in-50 duration-500">
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">无需预约</h3>
                    <p className="text-gray-500 mb-8 leading-relaxed text-sm">
                      该区域为开放服务空间，提供自由阅览与自助服务，<br />
                      无需预约即可直接使用。
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => { setShowEmptyNotice(false); autoFit(); }} className="bg-gray-900 text-white rounded-xl px-8 h-11 shadow-lg shadow-gray-900/25 hover:bg-gray-800 transition-all">
                        了解详情
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 暂无数据提示 */}
              {seats.length === 0 && layoutObjects.length === 0 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50/50">
                  <div className="text-center text-gray-400">暂无座位数据</div>
                </div>
              )}

              {/* 悬浮图例 */}
              <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-20 flex flex-col gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-white/60 px-3 py-2 sm:px-5 sm:py-3 shadow-xl backdrop-blur-xl border border-white/40">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-900/20">
                     <span className="text-white font-black text-xs sm:text-sm">{selectedZoneInfo?.floor}F</span>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight leading-none">{selectedZoneInfo?.name}</h4>
                    <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{availableSeatCount} 个可用座位</span>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col gap-3 rounded-2xl bg-white/60 p-5 shadow-xl backdrop-blur-xl border border-white/40 min-w-[160px]">
                  {[
                    { color: "bg-emerald-500", label: "空闲", status: "free" },
                    { color: "bg-amber-500", label: "限时可用", status: "limited" },
                    { color: "bg-rose-500", label: "占用中", status: "occupied" },
                    { color: "bg-gray-400", label: "预约中", status: "locked" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", item.color)} />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2 mt-1 border-t border-gray-100">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-900 ring-2 ring-gray-900/10" />
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">已选中</span>
                  </div>
                </div>

                <div className="sm:hidden flex flex-wrap items-center gap-2 rounded-xl bg-white/70 px-3 py-2 shadow-lg backdrop-blur-xl border border-white/50 max-w-[280px]">
                  {[
                    { color: "bg-emerald-500", label: "空闲" },
                    { color: "bg-amber-500", label: "限时" },
                    { color: "bg-rose-500", label: "占用" },
                    { color: "bg-gray-400", label: "预约" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                      <span className="text-[10px] font-bold text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 成功模态框 */}
              {showSuccessModal && (
                <div className="booking-success-overlay fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
                  <div className="booking-success-modal bg-white rounded-[32px] shadow-2xl shadow-gray-900/15 p-8 sm:p-10 max-w-sm w-full text-center relative border border-gray-100">
                    <div className="booking-success-icon mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-900 mb-8 shadow-2xl shadow-gray-900/20">
                      <Check className="h-10 w-10 text-white" strokeWidth={3} />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">预约成功！</h3>
                    <p className="text-gray-500 mb-10 text-sm font-medium leading-relaxed">
                      席位已成功锁定。请准时前往签到，开启您的深度学习之旅。
                    </p>
                    <div className="flex flex-col gap-4">
                      <Link href="/reservations">
                        <Button className="w-full h-14 text-lg font-bold rounded-2xl bg-gray-900 hover:bg-black shadow-xl shadow-gray-900/20 transition-all active:scale-[0.98]">
                          管理我的行程
                        </Button>
                      </Link>
                      <Button variant="ghost" onClick={() => setShowSuccessModal(false)} className="text-gray-400 h-12 rounded-xl font-bold hover:bg-gray-50 uppercase tracking-widest text-[10px]">
                        继续浏览
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 控制按钮 */}
              <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-8 z-20 flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col rounded-xl sm:rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-md">
                  <button
                    onClick={() => setTransform(t => ({ ...t, scale: Math.min(t.scale + 0.2, 4) }))}
                    className="p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-900"
                    title="放大"
                    aria-label="放大地图"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
                  </button>
                  <div className="h-px bg-gray-100 mx-2 sm:mx-3"></div>
                  <button
                    onClick={() => setTransform(t => ({ ...t, scale: Math.max(t.scale - 0.2, 0.1) }))}
                    className="p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-900"
                    title="缩小"
                    aria-label="缩小地图"
                  >
                    <Minus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
                  </button>
                </div>
                <button
                  onClick={autoFit}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-900 shadow-2xl shadow-gray-900/20 hover:bg-black transition-all active:scale-95 text-white"
                  title="复位视图"
                  aria-label="重置地图视图"
                >
                  <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* 交互画布 */}
              <div
                className={`touch-none flex-1 bg-[#F9FAFB] relative overflow-hidden ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                <div
                  className={`absolute origin-top-left will-change-transform ${isDragging ? "duration-0" : "transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    }`}
                  style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  }}
                >
                  <div
                    className="absolute inset-[-4000px] pointer-events-none opacity-[0.04]"
                    style={{
                      backgroundImage: "radial-gradient(#111827 1.5px, transparent 1.5px)",
                      backgroundSize: "24px 24px"
                    }}
                  />

                  {layoutObjects.map((obj) => (
                    <div
                      key={obj.id}
                      className={`absolute flex items-center justify-center text-xs select-none transition-all duration-300 ${selectedSeat ? "opacity-40 grayscale" : "opacity-100"
                        } ${obj.type === "wall" ? "bg-gradient-to-br from-gray-800 to-gray-900 shadow-md z-0" :
                          obj.type === "window" ? "bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 shadow-sm z-0" :
                            obj.type === "door" ? "bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-200 shadow-sm z-0" :
                              obj.type === "plant" ? "bg-gradient-to-br from-green-100 to-green-200/50 border-2 border-green-300 shadow-md z-10" :
                                "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] z-0"
                        }`}
                      style={{
                        left: `${obj.x}px`,
                        top: `${obj.y}px`,
                        width: `${obj.width}px`,
                        height: `${obj.height}px`,
                        borderRadius: obj.type === "table" ? "8px" : obj.type === "plant" ? "50%" : "2px",
                        transform: `rotate(${obj.rotation || 0}deg)`,
                      }}
                    >
                      {obj.label && obj.type !== "plant" && (
                        <span className={`font-medium scale-90 tracking-wider ${obj.type === "wall" ? "text-gray-400" :
                          obj.type === "window" ? "text-blue-600" :
                            obj.type === "door" ? "text-amber-600" :
                              "text-gray-500"
                          }`}>{obj.label}</span>
                      )}
                    </div>
                  ))}

                  {filteredSeats
                    .map((seat) => {
                      // 根据 displayStatus 确定座位样式
                      const status = seat.displayStatus || (seat.isAvailable ? "free" : "occupied");
                      const isClickable = status === "free" || status === "limited";

                      const getStatusStyles = () => {
                        if (selectedSeat?.id === seat.id) {
                          return "!bg-gray-900 !text-white !border-gray-900 ring-8 ring-gray-900/10 scale-125 shadow-2xl z-50";
                        }
                        switch (status) {
                          case "free":
                            return "bg-white border-emerald-200 text-emerald-600 hover:border-emerald-500 hover:scale-115 hover:shadow-xl hover:shadow-emerald-500/10 hover:z-30 cursor-pointer";
                          case "limited":
                            return "bg-white border-amber-200 text-amber-600 hover:border-amber-500 hover:scale-115 hover:shadow-xl hover:shadow-amber-500/10 hover:z-30 cursor-pointer";
                          case "occupied":
                            return "bg-gray-50 border-gray-100 text-rose-300 opacity-40 cursor-not-allowed";
                          case "locked":
                          default:
                            return "bg-gray-50 border-gray-100 text-gray-200 opacity-40 cursor-not-allowed";
                        }
                      };

                      return (
                        <button
                          key={seat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDragging && isClickable) handleSeatClick(seat);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={!isClickable}
                          style={{
                            position: "absolute",
                            left: `${seat.x}px`,
                            top: `${seat.y}px`,
                            width: "44px",
                            height: "44px",
                            zIndex: selectedSeat?.id === seat.id ? 50 : 20,
                            transform: `rotate(${seat.rotation || 0}deg)`,
                          }}
                          className={cn(
                            "group flex items-center justify-center rounded-2xl border-2 text-[10px] font-black transition-all duration-300 shadow-sm",
                            getStatusStyles()
                          )}
                          title={`${seat.seatNumber}${status === "limited" && seat.availableUntil ? ` (可用至 ${formatTime(seat.availableUntil)})` : ""}`}
                        >
                          <div className={cn(
                            "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                            status === 'free' ? "bg-emerald-500" :
                            status === 'limited' ? "bg-amber-500" :
                            status === 'occupied' ? "bg-rose-500" : "bg-gray-300"
                          )} />
                          <span
                            className="leading-none px-0.5 break-all transition-opacity tracking-tighter"
                            style={{ opacity: transform.scale < 0.6 ? 0 : 1 }}
                          >
                            {seat.seatNumber.replace(/^[A-Z]-/, '')}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {selectedSeat && (
                <>
                  {/* 移动端: 底部弹窗 */}
                  <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[70vh] overflow-auto animate-in slide-in-from-bottom duration-300">
                    <SeatDetailPanel
                      seat={selectedSeat}
                      zone={selectedSeatZone}
                      onClose={() => setSelectedSeat(null)}
                      onReserve={handleReserve}
                      onCancel={handleCancel}
                    />
                  </div>
                  {/* 移动端: 遮罩 */}
                  <div
                    className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    onClick={() => setSelectedSeat(null)}
                  />
                  {/* 桌面端: 侧边栏 */}
                  <div className="hidden sm:block w-[400px] flex-shrink-0 border-l border-gray-100 bg-white/80 backdrop-blur-3xl z-30 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[-20px_0_40px_rgba(0,0,0,0.03)]">
                    <SeatDetailPanel
                      seat={selectedSeat}
                      zone={selectedSeatZone}
                      onClose={() => setSelectedSeat(null)}
                      onReserve={handleReserve}
                      onCancel={handleCancel}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="danger"
        onConfirm={confirmDialog.action}
        loading={reservationLoading}
      />
    </div>
  );
}
