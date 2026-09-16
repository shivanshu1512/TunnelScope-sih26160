"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Check } from "lucide-react";
import { useAuth } from "@/features/auth";
import { ThemeToggle } from "@/features/theme";

export const HomeNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      setLoggedOut(true);
      setTimeout(() => {
        logout();
      }, 400);
    }, 400);
  };

  const displayName = user?.name || "Alex Rivera";
  const displayRole = user?.role || "SecOps Lead";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const isHome = pathname === "/" || pathname === "/home";
  const isAnalysis = pathname.startsWith("/analysis");

  return (
    <header className="sticky top-0 z-20 w-full transition-all duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <nav
          aria-label="Main Navigation"
          className="flex items-center justify-between h-14 px-4 sm:px-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 shadow-xs shadow-slate-900/5 dark:shadow-black/20 transition-colors duration-200"
        >
          {/* Left: Brand Logo & Wordmark */}
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 -m-1"
              aria-label="TunnelScope Home"
            >
              {/* Subtle Tunnel Path Icon */}
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                <svg
                  className="w-5 h-5 stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" className="opacity-40" />
                  <ellipse cx="12" cy="12" rx="5.5" ry="5.5" className="opacity-80" />
                  <path d="M12 7v10" />
                  <path d="M7 12h10" />
                </svg>
              </div>

              {/* Brand Wordmark */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  TunnelScope
                </span>
              </div>
            </Link>

            {/* Breadcrumb / Active Context indicator */}
            <div className="hidden sm:flex items-center ml-4 pl-4 border-l border-slate-200/80 dark:border-slate-800 gap-2">
              <Link
                href="/home"
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  isHome
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60"
                    : "bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                Workspace
              </Link>
              {isAnalysis && (
                <>
                  <span className="text-slate-300 dark:text-slate-700 text-xs">/</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    Assessment
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Theme Toggle, User details & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* User Details */}
            <div className="flex items-center gap-2.5 pl-1">
              <div
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-semibold select-none"
                title={displayName}
              >
                {initials}
              </div>

              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                  {displayRole}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 active:bg-slate-200/70 dark:active:bg-slate-700/70 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              aria-label="Log out of TunnelScope"
            >
              {loggedOut ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Logged out</span>
                </>
              ) : isLoggingOut ? (
                <span className="text-slate-400 dark:text-slate-500">Exiting...</span>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default HomeNavbar;
