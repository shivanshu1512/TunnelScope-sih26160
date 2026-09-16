"use client";

import React from "react";
import { ShieldAlert, Sparkles, ChevronRight } from "lucide-react";
import { AssessmentResult } from "../types";

export const SecurityImprovements: React.FC<{ assessment: AssessmentResult }> = ({
  assessment,
}) => {
  const getPriorityBadge = (priority: "High" | "Medium" | "Low") => {
    switch (priority) {
      case "High":
        return "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-900/60";
      case "Medium":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60";
      case "Low":
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60";
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 sm:p-7 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/60 dark:border-slate-800 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Prioritized Security Recommendations
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Actionable remediation baseline for cryptographic & tunnel hardening
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
          <Sparkles className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
          Demo Recommendations
        </span>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {assessment.recommendations.map((rec, idx) => (
          <div
            key={rec.id}
            className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-50 dark:hover:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5 shrink-0">
                {String(idx + 1).padStart(2, "0")}
              </span>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {rec.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(
                      rec.priority
                    )}`}
                  >
                    {rec.priority} Priority
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rec.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 sm:ml-4">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer">
                <span>View Remediation</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityImprovements;
