"use client";

import React from "react";
import { KineticGridBackground } from "@/components/background";
import { HomeNavbar } from "@/features/home";
import {
  useAnalysis,
  AnalysisHeader,
  SecurityScore,
  SecurityBreakdown,
  TunnelVisualization,
  KeyExchangeCard,
  TunnelCard,
  QuantumScore,
  CyberAssessment,
  TrafficChart,
  SecurityImprovements,
} from "@/features/analysis";

export default function AnalysisPage() {
  const { assessment } = useAnalysis();

  if (!assessment) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center">
        <KineticGridBackground />
        <div className="relative z-10 p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md text-center">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loading Assessment Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden">
      {/* Background layer (unmodified, non-blocking) */}
      <KineticGridBackground />

      {/* Foreground Workspace Layer */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <HomeNavbar />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Header Bar */}
          <AnalysisHeader assessment={assessment} />

          {/* Top Row: Overall Security Score + Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <SecurityScore assessment={assessment} />
            </div>
            <div className="lg:col-span-7">
              <SecurityBreakdown assessment={assessment} />
            </div>
          </div>

          {/* Centerpiece: Live Tunnel Flow Architecture */}
          <TunnelVisualization assessment={assessment} />

          {/* Second Row: Key Exchange + Transport Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KeyExchangeCard assessment={assessment} />
            <TunnelCard assessment={assessment} />
          </div>

          {/* Third Row: Quantum Security + Cyber Threat Dimensions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <QuantumScore assessment={assessment} />
            </div>
            <div className="lg:col-span-7">
              <CyberAssessment assessment={assessment} />
            </div>
          </div>

          {/* Fourth Row: Time-Series Traffic Chart */}
          <TrafficChart assessment={assessment} />

          {/* Fifth Row: Prioritized Security Improvements */}
          <SecurityImprovements assessment={assessment} />
        </main>

        <footer className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          TunnelScope • Network Tunnel Security & Entropy Analysis
        </footer>
      </div>
    </div>
  );
}
