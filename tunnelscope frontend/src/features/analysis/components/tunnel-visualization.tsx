"use client";

import React from "react";
import { Lock, ShieldCheck, Radio } from "lucide-react";
import { AssessmentResult } from "../types";

interface TunnelVisualizationProps {
  assessment: AssessmentResult;
}

export const TunnelVisualization: React.FC<TunnelVisualizationProps> = ({ assessment }) => {
  return (
    <div className="w-full rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6 sm:p-7 relative overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Live Tunnel Architecture & Flow Inspection
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active encapsulation chamber: {assessment.tunnelSpecs.tunnelType} via {assessment.tunnelSpecs.transportProtocol}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Tunnel Active & Encrypted
          </span>
        </div>
      </div>

      {/* Main Horizontal Schematic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Source Node */}
        <div className="lg:col-span-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Source Node
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              CLIENT
            </span>
          </div>
          <div className="space-y-0.5 font-mono text-xs text-slate-900 dark:text-slate-100 font-semibold">
            <p>192.168.1.104</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Port 54210 / WireGuard</p>
          </div>
          <div className="pt-1 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>Local Interface Encrypted</span>
          </div>
        </div>

        {/* Central Encrypted Tunnel Chamber */}
        <div className="lg:col-span-6 relative p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 dark:from-blue-950 dark:via-slate-950 dark:to-indigo-950 text-white shadow-md dark:shadow-black/40 border border-blue-900/50 dark:border-blue-900/40 overflow-hidden min-h-[140px] flex flex-col justify-between">
          {/* Animated Matrix Background Lines */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Chamber Header */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-blue-200">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold tracking-wide uppercase text-[10px] text-sky-300">
                Encrypted Tunnel Chamber
              </span>
            </div>
            <span className="font-mono text-[10px] text-blue-300/80">
              {assessment.tunnelSpecs.cipherSuite}
            </span>
          </div>

          {/* Flow Animation Stream */}
          <div className="relative z-10 my-3 flex items-center justify-between px-2">
            <div className="w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/80" />

            {/* Glowing Particle Packets */}
            <div className="flex-1 mx-4 h-1 bg-blue-950/60 rounded-full relative overflow-hidden border border-sky-500/30">
              {/* Animated Packet Pulses */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400 to-transparent w-28"
                style={{
                  animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
            </div>

            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
          </div>

          {/* Chamber Footer Badges */}
          <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 flex-wrap gap-2 pt-1 border-t border-white/10">
            <span className="text-sky-300">
              PFS: {assessment.tunnelSpecs.pfsEnabled ? "ECDH Active" : "Disabled"}
            </span>
            <span className="text-slate-300">
              Entropy: 7.94 / 8.0
            </span>
            <span className="text-emerald-400">
              Anti-Replay: ON
            </span>
          </div>
        </div>

        {/* Destination Node */}
        <div className="lg:col-span-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Destination Node
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
              GATEWAY
            </span>
          </div>
          <div className="space-y-0.5 font-mono text-xs text-slate-900 dark:text-slate-100 font-semibold">
            <p>10.0.4.15</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Port 51820 / VPN Peer</p>
          </div>
          <div className="pt-1 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>Integrity Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TunnelVisualization;
