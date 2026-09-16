"use client";

import React, { useRef } from "react";
import { UploadCloud, FileSpreadsheet, AlertCircle, ArrowUpRight } from "lucide-react";
import { UploadStatus, UploadError } from "../types";

interface CsvUploaderProps {
  status: UploadStatus;
  error: UploadError | null;
  onFileSelect: (file: File) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onLoadSample: () => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  status,
  error,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onLoadSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const isDragging = status === "dragging";
  const isValidating = status === "validating";

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center px-4">
      {/* Title & Tagline Hierarchy */}
      <div className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>TunnelScope Network Security</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
          Secure your tunnel
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto font-normal">
          Upload your network traffic dataset to begin a security assessment.
        </p>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        id="csv-file-input"
        aria-label="Upload CSV network traffic dataset"
        onChange={handleInputChange}
      />

      {/* Interactive Drag & Drop Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleButtonClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleButtonClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Click or drag and drop to upload CSV file"
        className={`w-full relative group cursor-pointer rounded-2xl p-8 sm:p-10 transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          isDragging
            ? "border-2 border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[1.01] shadow-lg shadow-blue-500/10"
            : "border border-dashed border-slate-300/80 dark:border-slate-800 hover:border-blue-400/90 dark:hover:border-blue-500/80 bg-white/50 dark:bg-slate-900/50 hover:bg-white/70 dark:hover:bg-slate-900/70 backdrop-blur-md shadow-xs hover:shadow-md hover:shadow-slate-900/5 dark:hover:shadow-black/30"
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Upload Icon Circle */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
              isDragging
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-blue-50 dark:bg-blue-950/70 border border-blue-100/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 shadow-2xs"
            }`}
          >
            <UploadCloud className="w-7 h-7 stroke-[2.2]" />
          </div>

          {/* Primary Action Button */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isValidating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all duration-150 focus-visible:outline-hidden cursor-pointer"
            >
              {isValidating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Validating CSV...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload CSV</span>
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              or drag & drop your <span className="font-mono text-slate-700 dark:text-slate-200 font-medium">.csv</span> file here
            </p>
          </div>

          {/* Supported Format Hint */}
          <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span>Supports standard packet captures & tunnel telemetry CSVs</span>
          </div>
        </div>
      </div>

      {/* Error Message if Validation Fails */}
      {error && (
        <div
          role="alert"
          className="w-full mt-4 p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/50 border border-red-200/80 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 text-left backdrop-blur-xs animate-in fade-in slide-in-from-top-1"
        >
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">{error.message}</p>
            {error.details && <p className="text-red-600 dark:text-red-400">{error.details}</p>}
          </div>
        </div>
      )}

      {/* Quick Sample Dataset Loader */}
      <div className="mt-6 flex items-center justify-center">
        <button
          type="button"
          onClick={onLoadSample}
          disabled={isValidating}
          className="group inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-3 py-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
          <span>Need a test file? Load sample tunnel dataset</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
};

export default CsvUploader;
