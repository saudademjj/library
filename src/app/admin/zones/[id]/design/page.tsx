"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Square, Armchair, DoorOpen, Monitor, MousePointer2, RotateCw, RotateCcw, AlignStartVertical, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal, AlignCenterVertical, AlignCenterHorizontal, ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Lock, Unlock, Eye, EyeOff, Layers, Flower2, RectangleHorizontal } from "lucide-react";

interface EditorItem {
  id: string;
  type: "wall" | "table" | "seat" | "door" | "window" | "plant";
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  seatType?: string;
  rotation?: number;
  locked?: boolean;
  visible?: boolean;
}

type ZoneLayoutItem = Omit<EditorItem, "locked" | "visible" | "seatType" | "type"> & {
  type: "wall" | "table" | "door" | "window" | "plant";
  seatType?: string;
};

type SeatApi = {
  id: number;
  seatNumber: string;
  x: number;
  y: number;
  seatType?: string;
  rotation?: number;
};

// 角度归一化到 0-360
const normalizeAngle = (angle: number): number => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export default function LayoutEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // 核心数据
  const [items, setItems] = useState<EditorItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 撤销/重做历史
  const [history, setHistory] = useState<EditorItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // UI 状态
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spacePressed, setSpacePressed] = useState(false);

  // 智能吸附辅助线
  const [snapLines, setSnapLines] = useState<{
    vertical: number[];
    horizontal: number[];
  }>({ vertical: [], horizontal: [] });

  // 画布视图状态
  const [view, setView] = useState({ x: 400, y: 200, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // 拖拽、缩放、旋转状态
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'rotate' | null;
    startMouse: { x: number; y: number };
    startItems: typeof items;
    handle?: string;
    itemCenter?: { x: number; y: number };
    startRotation?: number; // 记录旋转开始时的角度
  }>({ type: null, startMouse: { x: 0, y: 0 }, startItems: [] });

  // 框选状态
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // 剪贴板
  const [clipboard, setClipboard] = useState<EditorItem[]>([]);

  // 图层面板
  const [showLayers, setShowLayers] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // 历史记录管理
  const pushHistory = useCallback((newItems: EditorItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newItems)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const loadZoneData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const [zoneRes, seatsRes] = await Promise.all([
        fetch(`/api/zones/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/seats?zoneId=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const zoneData = await zoneRes.json();
      const seatsData = await seatsRes.json();

      if (zoneData.ok) {
        const rawLayout = zoneData.data.layoutObjects;
        const layoutObjs = (
          rawLayout
            ? (typeof rawLayout === "string" ? JSON.parse(rawLayout) : rawLayout)
            : []
        ) as ZoneLayoutItem[];

        const layoutItems: EditorItem[] = layoutObjs.map((i): EditorItem => ({
          ...i,
          type: i.type,
          locked: false,
          visible: true,
          rotation: normalizeAngle(i.rotation || 0),
        }));

        const existingSeats: EditorItem[] = (seatsData.data as SeatApi[]).map((s): EditorItem => ({
          id: `seat-${s.id}`,
          type: "seat",
          x: s.x,
          y: s.y,
          width: 40,
          height: 40,
          label: s.seatNumber,
          seatType: s.seatType,
          rotation: s.rotation || 0,
          locked: false,
          visible: true,
        }));

        const allItems: EditorItem[] = [...layoutItems, ...existingSeats];
        setItems(allItems);
        pushHistory(allItems);
      }
    } catch (e) {
      console.error("Load failed", e);
      toast.error("加载布局失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [id, pushHistory]);

  // 初始化加载
  useEffect(() => {
    void loadZoneData();
  }, [loadZoneData]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setItems(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setItems(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      const layoutObjects = items.filter(i => i.type !== "seat").map(i => ({
        id: i.id,
        type: i.type,
        x: Math.round(i.x),
        y: Math.round(i.y),
        width: Math.round(i.width),
        height: Math.round(i.height),
        label: i.label,
        rotation: normalizeAngle(i.rotation || 0)
      }));

      const seats = items.filter(i => i.type === "seat").map((i, index) => ({
        id: i.id, // 保持原始ID格式 (seat-123 或 seat-timestamp)
        seatNumber: i.label || `S-${index + 1}`,
        x: Math.round(i.x),
        y: Math.round(i.y),
        rotation: normalizeAngle(i.rotation || 0),
        seatType: i.seatType || "standard",
        facilities: i.seatType === "computer_desk" ? { hasComputer: true } : { hasSocket: true }
      }));

      console.log("保存数据:", { layoutObjects, seats }); // 调试日志

      const res = await fetch(`/api/zones/${id}/layout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ layoutObjects, seats })
      });

      const result = await res.json();

      if (res.ok) {
        // 保存成功后重新加载数据，确保ID同步
        await loadZoneData();
        toast.success("保存成功！布局已更新");
      } else {
        console.error("保存失败:", result);
        toast.error(`保存失败: ${result.error || "未知错误"}`);
      }
    } catch (e) {
      console.error("保存异常:", e);
      toast.error("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  // 视图控制
  const zoomIn = () => setView(v => ({ ...v, scale: Math.min(v.scale * 1.2, 5) }));
  const zoomOut = () => setView(v => ({ ...v, scale: Math.max(v.scale / 1.2, 0.1) }));
  const resetView = () => setView({ x: 400, y: 200, scale: 1 });

  // 画布交互
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const scaleBy = 1.1;
      const newScale = e.deltaY < 0 ? view.scale * scaleBy : view.scale / scaleBy;
      const clampedScale = Math.min(Math.max(newScale, 0.1), 5);
      setView(v => ({ ...v, scale: clampedScale }));
    } else {
      setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 空格键 + 左键 或 中键 -> 平移
    if ((e.button === 0 && spacePressed) || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    } else if (e.button === 0 && e.target === canvasRef.current) {
      // 点击空白处，启动框选
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - view.x) / view.scale;
      const worldY = (e.clientY - rect.top - view.y) / view.scale;

      setSelectionBox({
        startX: worldX,
        startY: worldY,
        endX: worldX,
        endY: worldY
      });

      if (!e.shiftKey) {
        setSelectedIds(new Set());
      }
    }
  };

  // 物品交互
  const handleItemMouseDown = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const item = items.find(i => i.id === itemId);
    if (item?.locked) return;

    if (!selectedIds.has(itemId)) {
      if (!e.shiftKey) {
        setSelectedIds(new Set([itemId]));
      } else {
        setSelectedIds(prev => new Set(prev).add(itemId));
      }
    }

    setDragState({
      type: 'move',
      startMouse: { x: e.clientX, y: e.clientY },
      startItems: items,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, itemId: string, handle: string) => {
    e.stopPropagation();
    setDragState({
      type: 'resize',
      handle,
      startMouse: { x: e.clientX, y: e.clientY },
      startItems: items,
    });
  };

  const handleRotateMouseDown = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;

    setDragState({
      type: 'rotate',
      startMouse: { x: e.clientX, y: e.clientY },
      startItems: items,
      itemCenter: { x: centerX, y: centerY },
      startRotation: item.rotation || 0
    });
  };

  // 全局鼠标事件监听
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (selectionBox && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - view.x) / view.scale;
        const worldY = (e.clientY - rect.top - view.y) / view.scale;
        setSelectionBox(prev => prev ? { ...prev, endX: worldX, endY: worldY } : null);
        return;
      }

      if (dragState.type === 'move') {
        const dx = (e.clientX - dragState.startMouse.x) / view.scale;
        const dy = (e.clientY - dragState.startMouse.y) / view.scale;

        const movedItems = dragState.startItems
          .filter(item => selectedIds.has(item.id))
          .map(startItem => ({
            ...startItem,
            x: startItem.x + dx,
            y: startItem.y + dy
          }));

        if (e.ctrlKey || e.metaKey) {
          const gridSnappedItems = movedItems.map(item => ({
            ...item,
            x: Math.round(item.x / 10) * 10,
            y: Math.round(item.y / 10) * 10
          }));
          setItems(prev => prev.map(item => {
            const snappedItem = gridSnappedItems.find(m => m.id === item.id);
            return snappedItem || item;
          }));
          setSnapLines({ vertical: [], horizontal: [] });
        } else {
          const { snappedItems, snapLines: newSnapLines } = calculateSnap(movedItems, dragState.startItems);
          setItems(prev => prev.map(item => {
            const snappedItem = snappedItems.find(m => m.id === item.id);
            return snappedItem || item;
          }));
          setSnapLines(newSnapLines);
        }
      }

      if (dragState.type === 'resize') {
        const activeId = Array.from(selectedIds)[0];
        if (!activeId) return;

        const dx = (e.clientX - dragState.startMouse.x) / view.scale;
        const dy = (e.clientY - dragState.startMouse.y) / view.scale;

        const startItem = dragState.startItems.find(i => i.id === activeId);
        if (!startItem) return;

        let { x, y, width, height } = startItem;
        const h = dragState.handle!;

        if (h.includes('e')) width += dx;
        if (h.includes('w')) { x += dx; width -= dx; }
        if (h.includes('s')) height += dy;
        if (h.includes('n')) { y += dy; height -= dy; }

        if (width < 20) width = 20;
        if (height < 20) height = 20;

        setItems(prev => prev.map(item => item.id === activeId ? { ...item, x, y, width, height } : item));
      }

      if (dragState.type === 'rotate') {
        const activeId = Array.from(selectedIds)[0];
        if (!activeId || !dragState.itemCenter) return;

        const startItem = dragState.startItems.find(i => i.id === activeId);
        if (!startItem) return;

        const centerScreenX = dragState.itemCenter.x * view.scale + view.x;
        const centerScreenY = dragState.itemCenter.y * view.scale + view.y;

        const startAngle = Math.atan2(
          dragState.startMouse.y - centerScreenY,
          dragState.startMouse.x - centerScreenX
        );

        const currentAngle = Math.atan2(
          e.clientY - centerScreenY,
          e.clientX - centerScreenX
        );

        const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
        let newRotation = (dragState.startRotation || 0) + deltaAngle;

        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        // 归一化角度
        newRotation = normalizeAngle(newRotation);

        setItems(prev => prev.map(item =>
          item.id === activeId ? { ...item, rotation: newRotation } : item
        ));
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (dragState.type) {
        pushHistory(items);
      }

      setIsPanning(false);
      setDragState({ type: null, startMouse: { x: 0, y: 0 }, startItems: [] });
      setSnapLines({ vertical: [], horizontal: [] });

      if (selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        const selectedInBox = items.filter(item => {
          if (!item.visible) return false;
          const itemLeft = item.x;
          const itemRight = item.x + item.width;
          const itemTop = item.y;
          const itemBottom = item.y + item.height;
          return !(itemRight < minX || itemLeft > maxX || itemBottom < minY || itemTop > maxY);
        });

        if (e.shiftKey) {
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            selectedInBox.forEach(item => newSet.add(item.id));
            return newSet;
          });
        } else {
          setSelectedIds(new Set(selectedInBox.map(i => i.id)));
        }

        setSelectionBox(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement as HTMLElement)?.tagName)) {
        return;
      }

      // 空格键
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
      }

      // Ctrl+Z / Cmd+Z - 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z - 重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      // Ctrl+Y / Cmd+Y - 重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Ctrl+C / Cmd+C - 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedIds.size > 0) {
          const selectedItems = items.filter(i => selectedIds.has(i.id));
          setClipboard(selectedItems);
          e.preventDefault();
        }
      }

      // Ctrl+V / Cmd+V - 粘贴
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard.length > 0) {
          const pastedItems = clipboard.map(item => ({
            ...item,
            id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: item.x + 20,
            y: item.y + 20,
          }));
          const newItems = [...items, ...pastedItems];
          setItems(newItems);
          setSelectedIds(new Set(pastedItems.map(i => i.id)));
          pushHistory(newItems);
          e.preventDefault();
        }
      }

      // Ctrl+A / Cmd+A - 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(items.filter(i => i.visible && !i.locked).map(i => i.id)));
      }

      // Delete / Backspace - 删除
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0) {
          const lockedCount = items.filter(i => selectedIds.has(i.id) && i.locked).length;
          if (lockedCount > 0) {
            toast.error(`无法删除：选中的 ${lockedCount} 个元素已锁定`);
            return;
          }
          // 直接删除选中元素（编辑器中按删除键意图明确，可通过 Ctrl+Z 撤销）
          const newItems = items.filter(i => !selectedIds.has(i.id));
          setItems(newItems);
          setSelectedIds(new Set());
          pushHistory(newItems);
          toast.success(`已删除 ${selectedIds.size} 个元素`);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanning, dragState, view, selectedIds, selectionBox, items, spacePressed, clipboard, historyIndex, history, pushHistory, redo, undo]);

  // 智能吸附计算
  const calculateSnap = (movingItems: EditorItem[], allItems: EditorItem[]) => {
    const SNAP_THRESHOLD = 5;
    const newSnapLines: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

    const staticItems = allItems.filter(item => !movingItems.some(m => m.id === item.id));

    movingItems.forEach(movingItem => {
      const movingLeft = movingItem.x;
      const movingRight = movingItem.x + movingItem.width;
      const movingTop = movingItem.y;
      const movingBottom = movingItem.y + movingItem.height;
      const movingCenterX = movingItem.x + movingItem.width / 2;
      const movingCenterY = movingItem.y + movingItem.height / 2;

      let snapDeltaX = 0;
      let snapDeltaY = 0;
      let minDistX = Infinity;
      let minDistY = Infinity;

      staticItems.forEach(staticItem => {
        const staticLeft = staticItem.x;
        const staticRight = staticItem.x + staticItem.width;
        const staticTop = staticItem.y;
        const staticBottom = staticItem.y + staticItem.height;
        const staticCenterX = staticItem.x + staticItem.width / 2;
        const staticCenterY = staticItem.y + staticItem.height / 2;

        const xDistances = [
          { dist: Math.abs(movingLeft - staticLeft), delta: staticLeft - movingLeft, line: staticLeft },
          { dist: Math.abs(movingLeft - staticRight), delta: staticRight - movingLeft, line: staticRight },
          { dist: Math.abs(movingRight - staticLeft), delta: staticLeft - movingRight, line: staticLeft },
          { dist: Math.abs(movingRight - staticRight), delta: staticRight - movingRight, line: staticRight },
          { dist: Math.abs(movingCenterX - staticCenterX), delta: staticCenterX - movingCenterX, line: staticCenterX },
        ];

        xDistances.forEach(({ dist, delta, line }) => {
          if (dist < SNAP_THRESHOLD && dist < minDistX) {
            minDistX = dist;
            snapDeltaX = delta;
            if (!newSnapLines.vertical.includes(line)) {
              newSnapLines.vertical.push(line);
            }
          }
        });

        const yDistances = [
          { dist: Math.abs(movingTop - staticTop), delta: staticTop - movingTop, line: staticTop },
          { dist: Math.abs(movingTop - staticBottom), delta: staticBottom - movingTop, line: staticBottom },
          { dist: Math.abs(movingBottom - staticTop), delta: staticTop - movingBottom, line: staticTop },
          { dist: Math.abs(movingBottom - staticBottom), delta: staticBottom - movingBottom, line: staticBottom },
          { dist: Math.abs(movingCenterY - staticCenterY), delta: staticCenterY - movingCenterY, line: staticCenterY },
        ];

        yDistances.forEach(({ dist, delta, line }) => {
          if (dist < SNAP_THRESHOLD && dist < minDistY) {
            minDistY = dist;
            snapDeltaY = delta;
            if (!newSnapLines.horizontal.includes(line)) {
              newSnapLines.horizontal.push(line);
            }
          }
        });
      });

      if (minDistX < Infinity) movingItem.x += snapDeltaX;
      if (minDistY < Infinity) movingItem.y += snapDeltaY;
    });

    return { snappedItems: movingItems, snapLines: newSnapLines };
  };

  // 对齐工具
  const alignItems = (type: string) => {
    if (selectedIds.size < 2) return;
    const selectedItems = items.filter(i => selectedIds.has(i.id));

    let newItems = [...items];

    if (type === 'left') {
      const minX = Math.min(...selectedItems.map(i => i.x));
      newItems = newItems.map(i => selectedIds.has(i.id) ? { ...i, x: minX } : i);
    } else if (type === 'right') {
      const maxRight = Math.max(...selectedItems.map(i => i.x + i.width));
      newItems = newItems.map(i => selectedIds.has(i.id) ? { ...i, x: maxRight - i.width } : i);
    } else if (type === 'top') {
      const minY = Math.min(...selectedItems.map(i => i.y));
      newItems = newItems.map(i => selectedIds.has(i.id) ? { ...i, y: minY } : i);
    } else if (type === 'bottom') {
      const maxBottom = Math.max(...selectedItems.map(i => i.y + i.height));
      newItems = newItems.map(i => selectedIds.has(i.id) ? { ...i, y: maxBottom - i.height } : i);
    } else if (type === 'centerX') {
      const avgCenterX = selectedItems.reduce((sum, i) => sum + i.x + i.width / 2, 0) / selectedItems.length;
      newItems = newItems.map(i => selectedIds.has(i.id) ? { ...i, x: avgCenterX - i.width / 2 } : i);
    } else if (type === 'centerY') {
      const avgCenterY = selectedItems.reduce((sum, i) => sum + i.y + i.height / 2, 0) / selectedItems.length;
      newItems = newItems.map(i => selectedIds.has(i.id) ? { ...i, y: avgCenterY - i.height / 2 } : i);
    }

    setItems(newItems);
    pushHistory(newItems);
  };

  // 旋转功能
  const rotateSelectedItems = (degrees: number) => {
    const newItems = items.map(item =>
      selectedIds.has(item.id) && !item.locked
        ? { ...item, rotation: normalizeAngle((item.rotation || 0) + degrees) }
        : item
    );
    setItems(newItems);
    pushHistory(newItems);
  };

  // 图层操作
  const toggleLock = (itemId: string) => {
    const newItems = items.map(i => i.id === itemId ? { ...i, locked: !i.locked } : i);
    setItems(newItems);
    pushHistory(newItems);
  };

  const toggleVisibility = (itemId: string) => {
    const newItems = items.map(i => i.id === itemId ? { ...i, visible: !i.visible } : i);
    setItems(newItems);
    pushHistory(newItems);
  };

  // 添加物品
  const addItem = (type: EditorItem["type"], label?: string, w = 60, h = 60, seatType?: string) => {
    const newItem: EditorItem = {
      id: `${type}-${Date.now()}`,
      type,
      x: -view.x / view.scale + 300,
      y: -view.y / view.scale + 200,
      width: w,
      height: h,
      label: label || (type === "seat" ? "新座位" : ""),
      seatType,
      rotation: 0,
      locked: false,
      visible: true
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    setSelectedIds(new Set([newItem.id]));
    pushHistory(newItems);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">编辑器加载中...</div>;

  const activeItem = items.find(i => selectedIds.has(i.id));
  const visibleItems = items.filter(i => i.visible !== false);

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* 顶部栏 */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/zones">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm">布局编辑器</h1>
            <div className="text-[10px] text-gray-500 flex gap-2 flex-wrap">
              <span>空格+拖拽平移</span>
              <span>Ctrl/⌘+滚轮缩放（滚轮平移）</span>
              <span>Shift选择多个</span>
              <span>Shift+旋转15°吸附</span>
              <span>Ctrl禁用智能吸附</span>
              <span>Ctrl+Z撤销</span>
              <span>Ctrl+C/V复制粘贴</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* 撤销/重做 */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={undo}
              disabled={historyIndex <= 0}
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="重做 (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* 对齐工具栏 */}
          {selectedIds.size >= 2 && (
            <div className="flex gap-1 items-center border-r pr-2">
              <span className="text-xs text-gray-500 mr-1">对齐:</span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => alignItems('left')} title="左对齐">
                <AlignStartHorizontal className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => alignItems('centerX')} title="水平居中">
                <AlignCenterHorizontal className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => alignItems('right')} title="右对齐">
                <AlignEndHorizontal className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => alignItems('top')} title="顶部对齐">
                <AlignStartVertical className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => alignItems('centerY')} title="垂直居中">
                <AlignCenterVertical className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => alignItems('bottom')} title="底部对齐">
                <AlignEndVertical className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* 旋转工具 */}
          {selectedIds.size >= 1 && (
            <div className="flex gap-1 items-center border-r pr-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => rotateSelectedItems(-90)}
                title="逆时针旋转90°"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => rotateSelectedItems(90)}
                title="顺时针旋转90°"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "保存中..." : "保存更改"}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧工具箱 */}
        <aside className="w-16 bg-white border-r flex flex-col items-center py-4 gap-4 z-10 shadow-sm overflow-y-auto">
          <ToolItem icon={<MousePointer2 />} label="选择" active />
          <div className="w-8 h-px bg-gray-200" />
          <ToolItem icon={<Square />} label="墙壁" onClick={() => addItem("wall", "", 200, 10)} />
          <ToolItem icon={<DoorOpen />} label="门" onClick={() => addItem("door", "门", 60, 10)} />
          <ToolItem icon={<RectangleHorizontal />} label="窗户" onClick={() => addItem("window", "窗", 80, 10)} />
          <ToolItem icon={<Square className="w-full" />} label="桌子" onClick={() => addItem("table", "桌子", 120, 60)} />
          <ToolItem icon={<Flower2 />} label="植物" onClick={() => addItem("plant", "🌿", 40, 40)} />
          <div className="w-8 h-px bg-gray-200" />
          <ToolItem icon={<Armchair />} label="座位" onClick={() => addItem("seat", "Seat")} />
          <ToolItem icon={<Monitor />} label="PC" onClick={() => addItem("seat", "PC", 50, 50, "computer_desk")} />
          <div className="w-8 h-px bg-gray-200" />
          <ToolItem
            icon={<Layers />}
            label="图层"
            onClick={() => setShowLayers(!showLayers)}
            active={showLayers}
          />
        </aside>

        {/* 主画布 */}
        <main
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden bg-[#E5E5E5] ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-default'
            }`}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
        >
          {/* 画布变换层 */}
          <div
            className="absolute origin-top-left"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          >
            {/* 网格 */}
            <div
              className="absolute inset-[-5000px] pointer-events-none opacity-20"
              style={{
                backgroundImage: "linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }}
            />
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-red-500 z-0" />

            {/* 智能吸附对齐线 */}
            {snapLines.vertical.map((x, i) => (
              <div key={`v-${i}`} className="absolute top-[-5000px] bottom-[-5000px] w-[1px] bg-blue-500 z-50 pointer-events-none" style={{ left: x }} />
            ))}
            {snapLines.horizontal.map((y, i) => (
              <div key={`h-${i}`} className="absolute left-[-5000px] right-[-5000px] h-[1px] bg-blue-500 z-50 pointer-events-none" style={{ top: y }} />
            ))}

            {/* 框选矩形 */}
            {selectionBox && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 z-50 pointer-events-none"
                style={{
                  left: Math.min(selectionBox.startX, selectionBox.endX),
                  top: Math.min(selectionBox.startY, selectionBox.endY),
                  width: Math.abs(selectionBox.endX - selectionBox.startX),
                  height: Math.abs(selectionBox.endY - selectionBox.startY)
                }}
              />
            )}

            {/* 渲染物品 */}
            {visibleItems.map(item => {
              const isSelected = selectedIds.has(item.id);
              const isLocked = item.locked;

              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                  className={`absolute flex items-center justify-center select-none group
                    ${isSelected ? "ring-2 ring-blue-500 z-20" : "hover:ring-1 hover:ring-blue-300 z-10"}
                    ${isLocked ? "opacity-60" : ""}
                    ${item.type === "wall" ? "bg-gradient-to-br from-gray-800 to-gray-900 shadow-md" :
                      item.type === "window" ? "bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 shadow-sm" :
                        item.type === "door" ? "bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-200 shadow-sm" :
                          item.type === "plant" ? "bg-gradient-to-br from-green-100 to-green-200/50 border-2 border-green-300 shadow-md" :
                            item.type === "seat" ? (item.seatType === "computer_desk" ? "bg-purple-100 border border-purple-400" : "bg-white border border-gray-400") :
                              "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 shadow-sm"}
                  `}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    borderRadius: item.type === "seat" ? 8 : item.type === "plant" ? "50%" : item.type === "table" ? 8 : 2,
                    boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                    transform: `rotate(${item.rotation || 0}deg)`,
                    cursor: isLocked ? 'not-allowed' : 'move'
                  }}
                >
                  {/* 锁定图标 */}
                  {isLocked && (
                    <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5">
                      <Lock className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}

                  {/* 内容 */}
                  {item.type === "seat" ? (
                    <div className="flex flex-col items-center scale-75">
                      {item.seatType === "computer_desk" && <Monitor className="w-4 h-4 mb-1 opacity-50" />}
                      <span className="text-[10px] font-bold text-gray-700">{item.label}</span>
                    </div>
                  ) : item.type === "plant" ? (
                    <span className="text-2xl">{item.label || "🌿"}</span>
                  ) : (
                    item.label && <span className={`text-[10px] font-medium ${item.type === "wall" ? "text-gray-400" :
                      item.type === "window" ? "text-blue-600" :
                        item.type === "door" ? "text-amber-600" :
                          "text-gray-500"
                      }`}>{item.label}</span>
                  )}

                  {/* 缩放手柄 */}
                  {isSelected && !isLocked && (
                    <>
                      {['nw', 'ne', 'sw', 'se'].map(h => (
                        <div
                          key={h}
                          onMouseDown={(e) => handleResizeMouseDown(e, item.id, h)}
                          className={`absolute w-3 h-3 bg-white border border-blue-500 rounded-full z-30
                            ${h === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : ''}
                            ${h === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : ''}
                            ${h === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : ''}
                            ${h === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : ''}
                          `}
                        />
                      ))}
                      {/* 旋转手柄 */}
                      <div
                        onMouseDown={(e) => handleRotateMouseDown(e, item.id)}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing z-30"
                      >
                        <div className="w-0.5 h-6 bg-blue-500 mb-1" />
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <RotateCw className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 视图控制面板 */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={zoomIn} title="放大">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="text-xs text-center text-gray-600">{Math.round(view.scale * 100)}%</div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={zoomOut} title="缩小">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="h-px bg-gray-200 my-1" />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={resetView} title="重置视图">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </main>

        {/* 右侧面板 */}
        <aside className="w-64 bg-white border-l z-10 flex flex-col">
          {/* 标签页 */}
          <div className="flex border-b">
            <button
              className={`flex-1 py-2 text-sm font-medium ${!showLayers ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setShowLayers(false)}
            >
              属性
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${showLayers ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setShowLayers(true)}
            >
              图层
            </button>
          </div>

          {/* 属性面板 */}
          {!showLayers && (
            <div className="p-4 flex-1 overflow-y-auto">
              {activeItem ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">ID</label>
                    <div className="text-xs font-mono bg-gray-50 p-1 rounded truncate">{activeItem.id}</div>
                  </div>

                  {activeItem.type === "seat" && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">座位号</label>
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={activeItem.label || ""}
                          onChange={(e) => setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, label: e.target.value } : i))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">类型</label>
                        <select
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={activeItem.seatType || "standard"}
                          onChange={(e) => setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, seatType: e.target.value } : i))}
                        >
                          <option value="standard">普通座位</option>
                          <option value="computer_desk">电脑位</option>
                        </select>
                      </div>
                    </>
                  )}

                  {!["seat"].includes(activeItem.type) && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">标签/备注</label>
                      <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={activeItem.label || ""}
                        onChange={(e) => setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, label: e.target.value } : i))}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                    <div>
                      <label className="text-xs text-gray-500">X</label>
                      <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={Math.round(activeItem.x)} readOnly />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Y</label>
                      <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={Math.round(activeItem.y)} readOnly />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">W</label>
                      <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={Math.round(activeItem.width)}
                        onChange={(e) => setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, width: Number(e.target.value) } : i))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">H</label>
                      <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={Math.round(activeItem.height)}
                        onChange={(e) => setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, height: Number(e.target.value) } : i))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">旋转(°)</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          value={Math.round(activeItem.rotation || 0)}
                          onChange={(e) => {
                            const newItems = items.map(i => i.id === activeItem.id ? { ...i, rotation: normalizeAngle(Number(e.target.value)) } : i);
                            setItems(newItems);
                          }}
                          onBlur={() => pushHistory(items)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 h-7"
                          onClick={() => rotateSelectedItems(-90)}
                          title="-90°"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 h-7"
                          onClick={() => rotateSelectedItems(90)}
                          title="+90°"
                        >
                          <RotateCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => toggleLock(activeItem.id)}
                    >
                      {activeItem.locked ? <Unlock className="h-3 w-3 mr-2" /> : <Lock className="h-3 w-3 mr-2" />}
                      {activeItem.locked ? '解锁' : '锁定'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm py-10">
                  请选择一个元素<br />进行编辑
                </div>
              )}
            </div>
          )}

          {/* 图层面板 */}
          {showLayers && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-1">
                {items.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-10">暂无图层</div>
                ) : (
                  items.slice().reverse().map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      onClick={() => {
                        if (!item.locked) {
                          setSelectedIds(new Set([item.id]));
                        }
                      }}
                    >
                      <button
                        className="p-0.5 hover:bg-gray-200 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(item.id);
                        }}
                      >
                        {item.visible === false ? <EyeOff className="h-3 w-3 text-gray-400" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        className="p-0.5 hover:bg-gray-200 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(item.id);
                        }}
                      >
                        {item.locked ? <Lock className="h-3 w-3 text-red-500" /> : <Unlock className="h-3 w-3 text-gray-400" />}
                      </button>
                      <div className="flex-1 text-sm truncate">
                        <span className="text-xs text-gray-500">{item.type}</span>
                        {item.label && <span className="ml-1 text-xs">: {item.label}</span>}
                      </div>
                      <span className="text-xs text-gray-400">{Math.round(item.rotation || 0)}°</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ToolItem({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-12 ${active ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-600"
        }`}
      title={label}
    >
      {icon}
      <span className="text-[10px] scale-90">{label}</span>
    </button>
  );
}
