"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../theme-context";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 active:scale-95 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-200 rotate-0 hover:rotate-45 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200 -rotate-12 hover:rotate-0 text-slate-600" />
      )}
    </button>
  );
};

export default ThemeToggle;
