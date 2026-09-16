"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCsvUpload } from "../hooks/use-csv-upload";
import { CsvUploader } from "./csv-uploader";
import { CsvPreview } from "./csv-preview";
import { useAnalysis, generateDemoAssessment } from "@/features/analysis";
import { Check, Loader2, Shield } from "lucide-react";

export const HomeWorkspace: React.FC = () => {
  const router = useRouter();
  const { setAssessmentData } = useAnalysis();

  const {
    status,
    meta,
    preview,
    error,
    processFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleLoadSample,
    handleReset,
  } = useCsvUpload();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const steps = [
    "Dataset validated",
    "Traffic structure detected",
    "Tunnel characteristics identified",
    "Cryptographic indicators evaluated",
    "Security assessment generated",
  ];

  const handleStartAnalysis = () => {
    if (!meta || !preview) return;
    setIsAnalyzing(true);
    setAnalysisStep(0);

    // Compute deterministic assessment
    const assessment = generateDemoAssessment(meta, preview.headers);
    setAssessmentData(assessment);
  };

  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            router.push("/analysis");
          }, 350);
          return prev;
        }
      });
    }, 280);

    return () => clearInterval(interval);
  }, [isAnalyzing, router, steps.length]);

  return (
    <section
      aria-label="Dataset Workspace"
      className="flex-1 w-full flex flex-col justify-center items-center py-10 sm:py-16 md:py-20 z-10"
    >
      {isAnalyzing ? (
        /* Polished Short Analysis Step Checklist */
        <div className="w-full max-w-md mx-auto p-7 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg text-left space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Evaluating Tunnel Security...
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {meta?.fileName}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {steps.map((text, idx) => {
              const isDone = idx <= analysisStep;
              const isCurrent = idx === analysisStep;

              return (
                <div
                  key={text}
                  className={`flex items-center gap-2.5 text-xs transition-all duration-150 ${
                    isDone
                      ? "text-slate-900 dark:text-slate-100 font-medium"
                      : "text-slate-400 dark:text-slate-600 font-normal"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-colors ${
                      isDone
                        ? "bg-emerald-500 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span>{text}</span>
                  {isCurrent && idx < steps.length - 1 && (
                    <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin ml-auto" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span>TunnelScope Analysis Pipeline</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">Running</span>
          </div>
        </div>
      ) : status === "parsed" && meta && preview ? (
        <CsvPreview
          meta={meta}
          preview={preview}
          onReset={handleReset}
          onAnalyze={handleStartAnalysis}
        />
      ) : (
        <CsvUploader
          status={status}
          error={error}
          onFileSelect={processFile}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onLoadSample={handleLoadSample}
        />
      )}
    </section>
  );
};

export default HomeWorkspace;
