"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";
import { DatasetMeta, DatasetPreviewData } from "../types";

interface CsvPreviewProps {
  meta: DatasetMeta;
  preview: DatasetPreviewData;
  onReset: () => void;
  onAnalyze: () => void;
}

export const CsvPreview: React.FC<CsvPreviewProps> = ({
  meta,
  preview,
  onReset,
  onAnalyze,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeClick = () => {
    setIsAnalyzing(true);
    onAnalyze();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header & Tagline Context */}
      <div className="text-center mb-6 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Secure your tunnel
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Dataset verified. Review your traffic capture before generating the security assessment.
        </p>
      </div>

      {/* Main Preview Container */}
      <div className="rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm shadow-slate-900/5 dark:shadow-black/30 overflow-hidden transition-colors duration-200">
        {/* Dataset Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {meta.fileName}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3" />
                  Validated
                </span>
              </div>

              {/* Metadata Pills */}
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  {meta.formattedSize}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1">
                  <Database className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  {meta.rowCount.toLocaleString()} rows
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  {meta.columnCount} columns
                </span>
              </div>
            </div>
          </div>

          {/* Change File / Clear Button */}
          <button
            type="button"
            onClick={onReset}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/60 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
            aria-label="Remove dataset and upload a different CSV"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Change File</span>
          </button>
        </div>

        {/* Scrollable Preview Table */}
        <div className="relative w-full overflow-x-auto max-h-[380px] overflow-y-auto border-b border-slate-200/60 dark:border-slate-800 scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-950/80 sticky top-0 z-10 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] w-12 text-center">
                  #
                </th>
                {preview.headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-l border-slate-200/50 dark:border-slate-800"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 dark:divide-slate-800/70 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              {preview.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors duration-75"
                >
                  <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 select-none bg-slate-50/30 dark:bg-slate-950/30">
                    {rowIdx + 1}
                  </td>
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="py-2 px-4 whitespace-nowrap border-l border-slate-100/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200"
                    >
                      {cell || <span className="text-slate-300 dark:text-slate-600 italic">null</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Summary Bar */}
        <div className="px-5 py-2.5 bg-slate-50/40 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>
            Displaying first {preview.rows.length} of {meta.rowCount.toLocaleString()} records
          </span>
          <span className="text-slate-400 dark:text-slate-500">All fields indexed for tunnel analysis</span>
        </div>

        {/* Action Footer */}
        <div className="p-5 sm:p-6 bg-white/60 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Ready to evaluate encryption strength, entropy, and potential leak vectors.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onReset}
              disabled={isAnalyzing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Processing Analysis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Dataset</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvPreview;
