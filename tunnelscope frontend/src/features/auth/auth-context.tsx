"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, DEMO_USERS } from "./types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "tunnelscope_auth_user_session";

function getInitialUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as User;
    }
  } catch {}
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [isLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const login = useCallback(
    async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
      await new Promise((res) => setTimeout(res, 350));

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { success: false, error: "Please enter an email address." };
      }
      if (!pass || pass.length < 3) {
        return { success: false, error: "Password must be at least 3 characters." };
      }

      const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
      const authenticatedUser: User = matched || {
        id: `usr_${Math.floor(Math.random() * 9000 + 1000)}`,
        name: cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        email: cleanEmail,
        role: "Security Engineer",
      };

      setUser(authenticatedUser);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
      } catch {}

      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem("tunnelscope_active_assessment");
    } catch {}
    router.push("/login");
  }, [router]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isAuth = !!user;
    const isLoginPage = pathname === "/login";

    if (!isAuth && !isLoginPage) {
      router.push("/login");
    } else if (isAuth && isLoginPage) {
      router.push("/home");
    }
  }, [user, isLoading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
