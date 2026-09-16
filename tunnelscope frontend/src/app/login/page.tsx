"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KineticGridBackground } from "@/components/background";
import { useAuth } from "@/features/auth";
import { ThemeToggle } from "@/features/theme";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("alex@tunnelscope.io");
  const [password, setPassword] = useState("tunnelscope");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push("/home");
      } else {
        setError(result.error || "Invalid authentication credentials.");
      }
    } catch {
      setError("An unexpected error occurred during sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("tunnelscope");
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <KineticGridBackground />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background layer (unmodified, non-blocking) */}
      <KineticGridBackground />

      {/* Floating Theme Toggle in top-right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 shadow-2xs" />
      </div>

      {/* Centered Login Workspace Layer */}
      <div className="relative z-10 w-full max-w-md mx-auto my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Brand & Tagline Header */}
        <div className="text-center mb-6 space-y-2">
          {/* Logo Badge */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/20 mb-2">
            <svg
              className="w-6 h-6 stroke-current"
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

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            TunnelScope
          </h1>

          <p className="text-base font-semibold text-blue-600 dark:text-blue-400 tracking-tight">
            Secure your tunnel
          </p>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Sign in to your security workspace.
          </p>
        </div>

        {/* Login Surface */}
        <div className="rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/80 shadow-lg shadow-slate-900/5 dark:shadow-black/30 p-6 sm:p-8 transition-colors duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tunnelscope.io"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-50/90 dark:bg-red-950/50 border border-red-200/80 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 text-left animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credential Helper */}
          <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              Demo Credentials available:
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("alex@tunnelscope.io")}
                className="px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 transition-colors cursor-pointer"
              >
                Alex (SecOps)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("devon@tunnelscope.io")}
                className="px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 transition-colors cursor-pointer"
              >
                Devon (Architect)
              </button>
            </div>
          </div>
        </div>

        {/* Footer Tagline */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>Secure tunnel intelligence starts here.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
