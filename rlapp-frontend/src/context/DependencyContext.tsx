"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";

import { AppointmentRepository } from "@/domain/ports/AppointmentRepository";
import { RealTimePort } from "@/domain/ports/RealTimePort";
import { HttpAppointmentAdapter } from "@/infrastructure/adapters/HttpAppointmentAdapter";
import SignalRAdapter from "@/infrastructure/adapters/SignalRAdapter";

interface DependencyContextType {
  repository: AppointmentRepository;
  realTime: RealTimePort;
}

const DependencyContext = createContext<DependencyContextType | null>(null);

export function DependencyProvider({ children }: { children: ReactNode }) {
  // 🛡️ HUMAN CHECK - Composition Root
  // Singletons are instantiated once here.
  const dependencies = useMemo(() => {
    return {
      repository: new HttpAppointmentAdapter(),
      // Use SignalRAdapter when available; fallback to SocketIoAdapter (disabled)
      realTime: new SignalRAdapter(),
    };
  }, []);

  return (
    <DependencyContext.Provider value={dependencies}>
      {children}
    </DependencyContext.Provider>
  );
}

export function useDependencies(): DependencyContextType {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error("useDependencies must be used within a DependencyProvider");
  }
  return context;
}
