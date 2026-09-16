"use client";

import React, { useEffect, useState } from "react";
import { Shield, Sparkles } from "lucide-react";
import { AssessmentResult } from "../types";

interface SecurityScoreProps {
  assessment: AssessmentResult;
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({ assessment }) => {
  const targetScore = assessment.overallScore;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Smooth count-up animation
    const duration = 1000;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * targetScore);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetScore]);

  const radius = 64;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (displayScore / 100) * circumference;

  return (
    <div className="h-full rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 sm:p-7 flex flex-col items-center justify-between text-center relative overflow-hidden transition-colors duration-200">
      {/* Top Label */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Security Score</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
          {assessment.postureLabel}
        </span>
      </div>

      {/* Radial Score Gauge */}
      <div className="my-6 relative flex items-center justify-center">
        <svg
          className="w-44 h-44 -rotate-90 transform"
          viewBox="0 0 160 160"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800/80"
            fill="transparent"
          />
          {/* Active Animated Progress Arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75"
            fill="transparent"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Numerical Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
          <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {displayScore}
          </span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {/* Context Summary */}
      <div className="space-y-2 max-w-sm">
        <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>Tunnel Evaluation Summary</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {assessment.summaryText}
        </p>
      </div>
    </div>
  );
};

export default SecurityScore;
