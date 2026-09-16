"use client";

import React from "react";
import { Key, Lock, Network, ShieldAlert, Cpu, Activity } from "lucide-react";
import { AssessmentResult, SecurityBreakdownItem } from "../types";

interface SecurityBreakdownProps {
  assessment: AssessmentResult;
}

export const SecurityBreakdown: React.FC<SecurityBreakdownProps> = ({ assessment }) => {
  const items: Array<{
    item: SecurityBreakdownItem;
    icon: React.ElementType;
    badgeStyle: string;
    barColor: string;
  }> = [
    {
      item: assessment.breakdown.encryption,
      icon: Lock,
      badgeStyle: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
      barColor: "bg-blue-600 dark:bg-blue-500",
    },
    {
      item: assessment.breakdown.keyExchange,
      icon: Key,
      badgeStyle: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
      barColor: "bg-emerald-500",
    },
    {
      item: assessment.breakdown.tunnelSecurity,
      icon: Network,
      badgeStyle: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60",
      barColor: "bg-indigo-600 dark:bg-indigo-500",
    },
    {
      item: assessment.breakdown.protocolSecurity,
      icon: Activity,
      badgeStyle: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
      barColor: "bg-sky-500",
    },
    {
      item: assessment.breakdown.quantumReadiness,
      icon: Cpu,
      badgeStyle: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
      barColor: "bg-amber-500",
    },
    {
      item: assessment.breakdown.cyberResilience,
      icon: ShieldAlert,
      badgeStyle: "bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80",
      barColor: "bg-slate-700 dark:bg-slate-400",
    },
  ];

  return (
    <div className="h-full rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between transition-colors duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Security Score Breakdown
        </h2>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          6 Core Dimensions
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
        {items.map(({ item, icon: Icon, badgeStyle, barColor }) => (
          <div
            key={item.name}
            className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                  {item.score}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}>
                  {item.status}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${item.score}%` }}
              />
            </div>

            {/* Subtext */}
            {item.details && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
                {item.details}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800">
        <span>Evaluated against TunnelScope Security Baseline</span>
        <span className="text-blue-600 dark:text-blue-400 font-medium font-mono text-[10px]">v2.4</span>
      </div>
    </div>
  );
};

export default SecurityBreakdown;
