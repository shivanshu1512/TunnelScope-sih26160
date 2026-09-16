"use client";

import React, { createContext, useContext, useState } from "react";
import { AssessmentResult } from "./types";
import { generateDemoAssessment } from "./utils/generate-demo-assessment";
import { generateSampleDataset } from "@/features/home/utils/csv-parser";

interface AnalysisContextType {
  assessment: AssessmentResult | null;
  setAssessmentData: (data: AssessmentResult) => void;
  clearAssessmentData: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

const STORAGE_KEY = "tunnelscope_active_assessment";

function getInitialAssessment(): AssessmentResult | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AssessmentResult;
    }
  } catch {}
  const sample = generateSampleDataset();
  return generateDemoAssessment(sample.meta, sample.preview.headers);
}

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assessment, setAssessment] = useState<AssessmentResult | null>(getInitialAssessment);

  const setAssessmentData = (data: AssessmentResult) => {
    setAssessment(data);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  };

  const clearAssessmentData = () => {
    setAssessment(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <AnalysisContext.Provider
      value={{
        assessment,
        setAssessmentData,
        clearAssessmentData,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export function useAnalysis(): AnalysisContextType {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
