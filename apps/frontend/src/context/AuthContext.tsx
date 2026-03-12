"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  type AuthSession,
  buildSession,
  clearSession,
  loadSession,
  saveSession,
  type UserRole,
} from "@/security/auth";
import { requestOperationalSession } from "@/services/api/auth";
import { AUTH_CHANGED_EVENT, AUTH_INVALID_EVENT } from "@/security/authEvents";

type AuthContextValue = {
  session: AuthSession | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  ready: boolean;
  signIn: (
    role: UserRole,
    ttlMinutes?: number,
    idCard?: string,
  ) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setReady(true);

    function onAuthInvalid() {
      setSession(null);
      clearSession();
    }

    function onAuthChanged() {
      setSession(loadSession());
    }

    window.addEventListener(AUTH_INVALID_EVENT, onAuthInvalid as EventListener);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged as EventListener);
    const expiryWatcher = window.setInterval(() => {
      const current = loadSession();
      if (!current) {
        setSession(null);
      }
    }, 30_000);

    return () => {
      window.removeEventListener(
        AUTH_INVALID_EVENT,
        onAuthInvalid as EventListener,
      );
      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        onAuthChanged as EventListener,
      );
      window.clearInterval(expiryWatcher);
    };
  }, []);

  const signIn = useCallback(
    async (role: UserRole, ttlMinutes = 120, idCard?: string) => {
      const next =
        role === "patient"
          ? buildSession(role, ttlMinutes)
          : await requestOperationalSession(role, idCard ?? "", ttlMinutes);

      saveSession(next);
      setSession(next);
    },
    [],
  );

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value: AuthContextValue = {
    session,
    role: session?.role ?? null,
    isAuthenticated: Boolean(session),
    ready,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
