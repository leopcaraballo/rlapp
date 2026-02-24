"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import Alert from "@/components/Alert";

type Variant = "error" | "success" | "info";

type AlertMessage = { id: string; message: string; variant: Variant };

type AlertContextValue = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<AlertMessage[]>([]);

  const push = useCallback((message: string, variant: Variant) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    const item: AlertMessage = { id, message, variant };
    setMessages((s) => [...s, item]);
    // auto remove after 5s
    setTimeout(() => {
      setMessages((s) => s.filter((m) => m.id !== id));
    }, 5000);
  }, []);

  const value: AlertContextValue = {
    showError: (m: string) => push(m, "error"),
    showSuccess: (m: string) => push(m, "success"),
    showInfo: (m: string) => push(m, "info"),
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <Alert message={m.message} variant={m.variant} />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within AlertProvider");
  return ctx;
}
