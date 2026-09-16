"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  CheckCircle2,
  Download,
  ArrowLeft,
  Sparkles,
  Layers,
  Database,
  Check,
} from "lucide-react";
import { AssessmentResult } from "../types";
import { downloadSecurityReport } from "../utils/download-report";

interface AnalysisHeaderProps {
  assessment: AssessmentResult;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({ assessment }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    downloadSecurityReport(assessment);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800">
      {/* Left: Title & Dataset Meta */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/home"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mr-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Security Assessment
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            Analysis Complete
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60">
            <Sparkles className="w-2.5 h-2.5" />
            Demo Assessment
          </span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {assessment.datasetName}
          </h1>
        </div>

        {/* Dataset Stats Pills */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
          <span className="inline-flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
            {assessment.datasetName}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {assessment.rowCount.toLocaleString()} records
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {assessment.columnCount} columns
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-slate-400 dark:text-slate-500 text-[11px]">
            Analyzed {assessment.analyzedAt}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>New Upload</span>
        </Link>

        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
          {downloaded ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-200" />
              <span>Report Downloaded</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalysisHeader;
