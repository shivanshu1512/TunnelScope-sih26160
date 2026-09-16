"use client";

import React from "react";
import { Atom, Sparkles, Shield } from "lucide-react";
import { AssessmentResult } from "../types";

export const QuantumScore: React.FC<{ assessment: AssessmentResult }> = ({
  assessment,
}) => {
  const qScore = assessment.breakdown.quantumReadiness.score;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white/80 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-md border border-indigo-200/60 dark:border-indigo-900/60 shadow-sm p-6 flex flex-col justify-between transition-colors duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-indigo-100/80 dark:border-indigo-900/60 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
            <Atom className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              Quantum Security
            </h3>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              Post-Quantum Cryptography Readiness
            </span>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
          Moderate
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-2">
        {/* Score Ring / Pill */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs text-center">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-4xl font-extrabold text-indigo-950 dark:text-indigo-200">
              {qScore}
            </span>
            <span className="text-xs text-indigo-400 dark:text-indigo-500 font-bold">/ 100</span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mt-1">
            Quantum Resilience Index
          </span>
        </div>

        {/* Narrative & Mitigation */}
        <div className="sm:col-span-8 space-y-2 text-left">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Current symmetric encryption (256-bit AEAD) provides high quantum resistance. However, key exchange relies on classical discrete-log curves vulnerable to Shor&apos;s algorithm.
          </p>
          <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Recommendation: Deploy hybrid KEM (ML-KEM-768 / Kyber) in Phase 1 negotiation.
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/60 text-[10px] text-indigo-500/80 dark:text-indigo-400/80">
        Assessment reflects apparent cryptographic signatures of the dataset and is presented as a demonstration metric.
      </div>
    </div>
  );
};

export const CyberAssessment: React.FC<{ assessment: AssessmentResult }> = ({
  assessment,
}) => {
  return (
    <div className="h-full rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between transition-colors duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cyber Threat & Exposure Assessment
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
          Score: {assessment.breakdown.cyberResilience.score}/100
        </span>
      </div>

      <div className="space-y-3.5">
        {assessment.cyberDimensions.map((dim) => (
          <div key={dim.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{dim.name}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{dim.score}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{dim.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>Zero Critical Vulnerabilities Detected</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-[10px]">ALL CLEAR</span>
      </div>
    </div>
  );
};
