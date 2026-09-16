"use client";

import React from "react";
import { Activity } from "lucide-react";
import { AssessmentResult } from "../types";
import { useTheme } from "@/features/theme";

export const TrafficChart: React.FC<{ assessment: AssessmentResult }> = ({
  assessment,
}) => {
  const { isDark } = useTheme();
  const points = assessment.trafficSeries;
  const maxPackets = Math.max(...points.map((p) => p.packets), 1000);

  // Generate SVG path for throughput line and area
  const svgWidth = 600;
  const svgHeight = 140;
  const paddingX = 20;
  const paddingY = 15;

  const getCoordinates = (index: number, value: number) => {
    const x =
      paddingX +
      (index / (points.length - 1)) * (svgWidth - paddingX * 2);
    const y =
      svgHeight -
      paddingY -
      (value / maxPackets) * (svgHeight - paddingY * 2);
    return { x, y };
  };

  const polylinePoints = points
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.packets);
      return `${x},${y}`;
    })
    .join(" ");

  const firstPt = getCoordinates(0, points[0].packets);
  const lastPt = getCoordinates(points.length - 1, points[points.length - 1].packets);
  const areaPath = `M ${firstPt.x},${firstPt.y} ${polylinePoints} L ${lastPt.x},${svgHeight - paddingY} L ${firstPt.x},${svgHeight - paddingY} Z`;

  return (
    <div className="rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between transition-colors duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tunnel Traffic & Packet Entropy Over Time
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            Throughput (Kbps)
          </span>
          <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            Avg Entropy: 7.91
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-36 overflow-visible"
          preserveAspectRatio="none"
          aria-label="Packet throughput chart"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={isDark ? 0.35 : 0.25} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={svgWidth - paddingX}
            y2={paddingY}
            stroke={isDark ? "#1e293b" : "#e2e8f0"}
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={svgHeight / 2}
            x2={svgWidth - paddingX}
            y2={svgHeight / 2}
            stroke={isDark ? "#1e293b" : "#e2e8f0"}
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={svgHeight - paddingY}
            x2={svgWidth - paddingX}
            y2={svgHeight - paddingY}
            stroke={isDark ? "#334155" : "#cbd5e1"}
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Line */}
          <polyline
            fill="none"
            stroke={isDark ? "#38bdf8" : "#2563eb"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const { x, y } = getCoordinates(i, p.packets);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.5"
                className="fill-white dark:fill-slate-900 stroke-blue-600 dark:stroke-sky-400 stroke-2 hover:r-5 transition-all cursor-pointer"
              />
            );
          })}
        </svg>

        {/* X Axis Labels */}
        <div className="flex justify-between px-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
          {points
            .filter((_, i) => i % 2 === 0)
            .map((p) => (
              <span key={p.time}>{p.time}</span>
            ))}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>Observed Packet Streams: {assessment.rowCount.toLocaleString()} frames</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Stable Encrypted Stream</span>
      </div>
    </div>
  );
};

export default TrafficChart;
