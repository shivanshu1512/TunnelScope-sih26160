"use client";

import React from "react";
import { Key, Check, Lock } from "lucide-react";
import { AssessmentResult } from "../types";

export const KeyExchangeCard: React.FC<{ assessment: AssessmentResult }> = ({
  assessment,
}) => {
  const specs = assessment.tunnelSpecs;

  return (
    <div className="h-full rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center">
              <Key className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Key Exchange Policy
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            {assessment.breakdown.keyExchange.status}
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Protocol</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{specs.keyExchangeMethod}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Forward Secrecy</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
              <Check className="w-3 h-3" />
              PFS Enabled
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Authentication</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{specs.authDigest}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>Rekeying Interval</span>
        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">3600s / 1 GB</span>
      </div>
    </div>
  );
};

export const TunnelCard: React.FC<{ assessment: AssessmentResult }> = ({
  assessment,
}) => {
  const specs = assessment.tunnelSpecs;

  return (
    <div className="h-full rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transport / Encapsulation
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            {assessment.breakdown.tunnelSecurity.status}
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Tunnel Framework</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{specs.tunnelType}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Transport Protocol</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{specs.transportProtocol}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Cipher Suite</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{specs.cipherSuite}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>Interface MTU</span>
        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{specs.mtuSize} Bytes</span>
      </div>
    </div>
  );
};
