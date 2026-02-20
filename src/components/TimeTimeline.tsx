"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface TimeTimelineProps {
    date: Date;
    selectedStart: string; // HH:mm
    selectedEnd: string;   // HH:mm
    reservations: { startTime: string; endTime: string }[];
    onChange: (start: string, end: string) => void;
    minTime?: string; // HH:mm, default 00:00
    maxTime?: string; // HH:mm, default 24:00
    disabled?: boolean;
}

export default function TimeTimeline({
    selectedStart,
    selectedEnd,
    reservations,
    onChange,
    minTime = "00:00",
    maxTime = "24:00",
    disabled = false,
}: TimeTimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<"start" | "end" | "move" | null>(null);
    const dragStartXRef = useRef(0);
    const initialDragTimeRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const pendingChangeRef = useRef<{ start: string; end: string } | null>(null);

    // Helper: Convert HH:mm to minutes
    const timeToMinutes = (time: string) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    };

    // Helper: Convert minutes to HH:mm
    const minutesToTime = (minutes: number) => {
        let h = Math.floor(minutes / 60);
        let m = Math.floor(minutes % 60);
        if (h >= 24) { h = 23; m = 59; } // Cap at 23:59
        if (h < 0) { h = 0; m = 0; }
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    const minMinutes = timeToMinutes(minTime);
    const maxMinutes = timeToMinutes(maxTime);
    const totalMinutes = maxMinutes - minMinutes;

    const currentStart = timeToMinutes(selectedStart);
    const currentEnd = timeToMinutes(selectedEnd);

    // Calculate position percentage
    const getPercent = (minutes: number) => {
        return ((minutes - minMinutes) / totalMinutes) * 100;
    };

    // Handle interaction
    const handleMouseDown = (e: React.MouseEvent, type: "start" | "end" | "move") => {
        if (disabled) return;
        setIsDragging(type);
        dragStartXRef.current = e.clientX;
        if (type === "start") initialDragTimeRef.current = currentStart;
        if (type === "end") initialDragTimeRef.current = currentEnd;
        if (type === "move") initialDragTimeRef.current = currentStart; // Track start for move
    };

    useEffect(() => {
        const flushPendingChange = () => {
            if (pendingChangeRef.current) {
                const { start, end } = pendingChangeRef.current;
                pendingChangeRef.current = null;
                onChange(start, end);
            }
            rafRef.current = null;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaPercent = (deltaX / rect.width) * 100;
            const deltaMinutes = (deltaPercent / 100) * totalMinutes;

            let newStart = currentStart;
            let newEnd = currentEnd;

            if (isDragging === "start") {
                newStart = Math.min(Math.max(minMinutes, initialDragTimeRef.current + deltaMinutes), currentEnd - 15); // Min 15m duration
            } else if (isDragging === "end") {
                newEnd = Math.max(Math.min(maxMinutes, initialDragTimeRef.current + deltaMinutes), currentStart + 15);
            } else if (isDragging === "move") {
                const duration = currentEnd - currentStart;
                newStart = Math.max(minMinutes, Math.min(maxMinutes - duration, initialDragTimeRef.current + deltaMinutes));
                newEnd = newStart + duration;
            }

            // Snap to 15 mins
            newStart = Math.round(newStart / 15) * 15;
            newEnd = Math.round(newEnd / 15) * 15;

            pendingChangeRef.current = { start: minutesToTime(newStart), end: minutesToTime(newEnd) };
            if (rafRef.current === null) {
                rafRef.current = window.requestAnimationFrame(flushPendingChange);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(null);
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            if (pendingChangeRef.current) {
                const { start, end } = pendingChangeRef.current;
                pendingChangeRef.current = null;
                onChange(start, end);
            }
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [isDragging, currentStart, currentEnd, minMinutes, maxMinutes, totalMinutes, onChange]);

    // Determine blocked regions
    const blockedRegions = useMemo(
        () =>
            reservations.map(r => ({
                start: (((Number(r.startTime.slice(0, 2)) * 60 + Number(r.startTime.slice(3, 5))) - minMinutes) / totalMinutes) * 100,
                width:
                    ((((Number(r.endTime.slice(0, 2)) * 60 + Number(r.endTime.slice(3, 5))) - minMinutes) / totalMinutes) -
                        (((Number(r.startTime.slice(0, 2)) * 60 + Number(r.startTime.slice(3, 5))) - minMinutes) / totalMinutes)) *
                    100,
            })),
        [reservations, minMinutes, totalMinutes]
    );

    const startPercent = getPercent(currentStart);
    const widthPercent = getPercent(currentEnd) - startPercent;

    return (
        <div className="relative h-16 w-full pt-6 select-none" ref={containerRef}>
            {/* Background Track */}
            <div className="absolute top-4 h-8 w-full rounded-md bg-gray-100 border border-gray-200 overflow-hidden">
                {/* Hour Markers */}
                {Array.from({ length: 25 }).map((_, i) => {
                    const time = i * 60;
                    if (time < minMinutes || time > maxMinutes) return null;
                    const left = getPercent(time);
                    return (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-gray-300/50" style={{ left: `${left}%` }}>
                            <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-gray-400">
                                {i % 4 === 0 ? i : ''}
                            </span>
                        </div>
                    );
                })}

                {/* Blocked Regions */}
                {blockedRegions.map((r, i) => (
                    <div
                        key={i}
                        className="absolute top-1 bottom-1 bg-red-200/50 border border-red-300/50 rounded-sm"
                        style={{ left: `${r.start}%`, width: `${r.width}%` }}
                    />
                ))}

                {/* Selected Region */}
                <div
                    className="absolute top-0 bottom-0 bg-blue-500/20 border-l-2 border-r-2 border-blue-500 cursor-move group"
                    style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                    onMouseDown={(e) => handleMouseDown(e, "move")}
                >
                    {/* Review: Show time inside */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-blue-700 pointer-events-none">
                        {selectedStart} - {selectedEnd}
                    </div>
                </div>
            </div>

            {/* Handles (Use simple divs for now, placed outside or on edge) */}
            {/* Actually, the border of the selected region acts as handle, but let's add explicit hit areas */}
            <div
                className="absolute top-4 h-8 w-4 -ml-2 cursor-ew-resize z-10 hover:bg-blue-500/10"
                style={{ left: `${startPercent}%` }}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "start"); }}
            />
            <div
                className="absolute top-4 h-8 w-4 -ml-2 cursor-ew-resize z-10 hover:bg-blue-500/10"
                style={{ left: `${startPercent + widthPercent}%` }}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "end"); }}
            />

            {/* Current Time Indicator (if date is today) */}
            {/* TODO: Add this later if needed */}
        </div>
    );
}
