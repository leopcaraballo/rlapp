import { http, HttpResponse } from "@test/mocks/handlers";
import { server } from "@test/mocks/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── mock React.use (Next.js App Router params: Promise<T>) ──────────────────
let mockParams: { serviceId: string };

jest.spyOn(React, "use").mockImplementation(() => mockParams as any);

// ── mock useAtencion ─────────────────────────────────────────────────────────
import type {
  AtencionMonitorView,
  AtencionStateView,
  NextTurnView,
  RecentAttentionRecordView,
} from "@/services/api/types";

let mockMonitor: AtencionMonitorView | null = null;
let mockQueueState: AtencionStateView | null = null;
let mockNextTurn: NextTurnView | null = null;
let mockHistory: RecentAttentionRecordView[] = [];
let mockLastUpdated: string | null = null;
let mockRefresh: jest.Mock;

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ role: "admin", isAuthenticated: true, signOut: jest.fn() }),
}));

jest.mock("@/hooks/useAtencion", () => ({
  useAtencion: () => ({
    monitor: mockMonitor,
    queueState: mockQueueState,
    nextTurn: mockNextTurn,
    history: mockHistory,
    lastUpdated: mockLastUpdated,
    connectionState: "online" as const,
    refresh: mockRefresh,
    fullState: null,
    setMonitor: jest.fn(),
    setQueueState: jest.fn(),
    setFullState: jest.fn(),
    setNextTurn: jest.fn(),
  }),
}));

import AtencionPage from "@/app/atencion/[serviceId]/page";

// ── helper ────────────────────────────────────────────────────────────────────
function renderAtencion(serviceId = "SVC-01") {
  mockParams = { serviceId };
  return render(<AtencionPage params={Promise.resolve({ serviceId })} />);
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("AtencionPage — RED", () => {
  beforeEach(() => {
    mockParams = { serviceId: "SVC-01" };
    mockMonitor = null;
    mockQueueState = null;
    mockNextTurn = null;
    mockHistory = [];
    mockLastUpdated = null;
    mockRefresh = jest.fn();
  });

  // ── 1. serviceId en cabecera ──────────────────────────────────────────────
  it("muestra el serviceId en la cabecera principal", () => {
    renderAtencion("SVC-01");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Cola — SVC-01",
    );
  });

  // ── 2. useEffect llama a refresh al montar ────────────────────────────────
  it("llama a refresh al montar el componente", () => {
    renderAtencion();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  // ── 3. MonitorCard: estado null ───────────────────────────────────────────
  it("MonitorCard muestra 'No hay datos disponibles' cuando monitor es null", () => {
    mockMonitor = null;
    renderAtencion();
    expect(screen.getByText("No hay datos disponibles.")).toBeInTheDocument();
  });

  // ── 4. MonitorCard: con datos ─────────────────────────────────────────────
  it("MonitorCard muestra totalPatientsWaiting cuando monitor tiene datos", () => {
    mockMonitor = {
      serviceId: "SVC-01",
      totalPatientsWaiting: 7,
      highPriorityCount: 2,
      normalPriorityCount: 4,
      lowPriorityCount: 1,
      lastPatientCheckedInAt: null,
      averageWaitTimeMinutes: 12,
      utilizationPercentage: 70,
      projectedAt: "2026-03-02T10:00:00Z",
    };
    renderAtencion();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // ── 5. QueueStateCard: estado null ────────────────────────────────────────
  it("QueueStateCard muestra 'No hay datos' cuando queueState es null", () => {
    mockQueueState = null;
    renderAtencion();
    expect(screen.getByText("No hay datos.")).toBeInTheDocument();
  });

  // ── 6. QueueStateCard: con datos ──────────────────────────────────────────
  it("QueueStateCard muestra currentCount y maxCapacity cuando queueState tiene datos", () => {
    mockQueueState = {
      serviceId: "SVC-01",
      currentCount: 5,
      maxCapacity: 20,
      isAtCapacity: false,
      availableSpots: 15,
      patientsInQueue: [],
      projectedAt: "2026-03-02T10:00:00Z",
    };
    renderAtencion();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  // ── 7. NextTurnCard: estado null ──────────────────────────────────────────
  it("NextTurnCard muestra 'No hay paciente en curso' cuando nextTurn es null", () => {
    mockNextTurn = null;
    renderAtencion();
    expect(screen.getByText("No hay paciente en curso.")).toBeInTheDocument();
  });

  // ── 8. NextTurnCard: con datos ────────────────────────────────────────────
  it("NextTurnCard muestra el nombre del paciente cuando nextTurn tiene datos", () => {
    mockNextTurn = {
      serviceId: "SVC-01",
      patientId: "P1",
      patientName: "Laura Medina",
      turnNumber: 1,
      priority: "High",
      consultationType: "General",
      status: "In Progress",
      claimedAt: null,
      calledAt: null,
      stationId: "CONS-01",
      projectedAt: "2026-03-02T10:00:00Z",
    } as NextTurnView;
    renderAtencion();
    expect(screen.getByText("Laura Medina")).toBeInTheDocument();
  });

  // ── 9. RecentHistory: vacía ───────────────────────────────────────────────
  it("RecentHistory muestra 'No hay atenciones recientes' cuando history está vacía", () => {
    mockHistory = [];
    renderAtencion();
    expect(
      screen.getByText("No hay atenciones recientes."),
    ).toBeInTheDocument();
  });

  // ── 10. RecentHistory: con datos ──────────────────────────────────────────
  it("RecentHistory muestra el nombre del paciente cuando history tiene entradas", () => {
    mockHistory = [
      {
        serviceId: "SVC-01",
        patientId: "P2",
        patientName: "Carlos Ríos",
        priority: "Medium",
        consultationType: "General",
        completedAt: "2026-03-02T09:00:00Z",
        outcome: "Alta",
      } as RecentAttentionRecordView,
    ];
    renderAtencion();
    expect(screen.getByText("Carlos Ríos")).toBeInTheDocument();
  });

  // ── 11. Links de acciones rápidas ─────────────────────────────────────────
  it("los links de acciones rápidas incluyen el serviceId codificado en el href", () => {
    renderAtencion("SALA A");
    const encoded = encodeURIComponent("SALA A");

    const linkReception = screen.getByRole("link", {
      name: /Registrar check-in/i,
    });
    const linkCashier = screen.getByRole("link", { name: /Ir a caja/i });
    const linkMedical = screen.getByRole("link", { name: /Ir a área médica/i });

    expect(linkReception).toHaveAttribute(
      "href",
      `/reception?queue=${encoded}`,
    );
    expect(linkCashier).toHaveAttribute("href", `/payment?queue=${encoded}`);
    expect(linkMedical).toHaveAttribute("href", `/medical?queue=${encoded}`);
  });

  // ── 12. Botón Reconstruir proyección ──────────────────────────────────────
  it("el botón Reconstruir hace POST al endpoint correcto y llama a refresh", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/v1/atencion/:serviceId/rebuild", () =>
        HttpResponse.json(null, { status: 200 }),
      ),
    );
    renderAtencion("SVC-01");
    const btn = screen.getByRole("button", { name: /Reconstruir proyección/i });
    await user.click(btn);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });
});
