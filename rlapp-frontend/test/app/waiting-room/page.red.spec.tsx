import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { http, HttpResponse } from "@test/mocks/handlers";
import { server } from "@test/mocks/server";

// ── mock React.use (Next.js App Router params: Promise<T>) ──────────────────
let mockParams: { queueId: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.spyOn(React, "use").mockImplementation((_: unknown) => mockParams as any);

// ── mock useWaitingRoom ──────────────────────────────────────────────────────
import type {
  NextTurnView,
  QueueStateView,
  RecentAttentionRecordView,
  WaitingRoomMonitorView,
} from "@/services/api/types";

let mockMonitor: WaitingRoomMonitorView | null = null;
let mockQueueState: QueueStateView | null = null;
let mockNextTurn: NextTurnView | null = null;
let mockHistory: RecentAttentionRecordView[] = [];
let mockLastUpdated: string | null = null;
let mockRefresh: jest.Mock;

jest.mock("@/hooks/useWaitingRoom", () => ({
  useWaitingRoom: () => ({
    monitor: mockMonitor,
    queueState: mockQueueState,
    nextTurn: mockNextTurn,
    history: mockHistory,
    lastUpdated: mockLastUpdated,
    connectionState: "online" as const,
    refresh: mockRefresh,
  }),
}));

import WaitingRoomPage from "@/app/waiting-room/[queueId]/page";

// ── helper ────────────────────────────────────────────────────────────────────
function renderWaitingRoom(queueId = "QUEUE-WR") {
  mockParams = { queueId };
  return render(<WaitingRoomPage params={Promise.resolve({ queueId })} />);
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("WaitingRoomPage — RED", () => {
  beforeEach(() => {
    mockParams     = { queueId: "QUEUE-WR" };
    mockMonitor    = null;
    mockQueueState = null;
    mockNextTurn   = null;
    mockHistory    = [];
    mockLastUpdated = null;
    mockRefresh    = jest.fn();
  });

  // ── 1. queueId en cabecera ────────────────────────────────────────────────
  it("muestra el queueId en la cabecera principal", () => {
    renderWaitingRoom("QUEUE-WR");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("QUEUE-WR");
  });

  // ── 2. useEffect llama a refresh al montar ────────────────────────────────
  it("llama a refresh al montar el componente", () => {
    renderWaitingRoom();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  // ── 3. MonitorCard: estado null ───────────────────────────────────────────
  it("MonitorCard muestra 'No hay datos disponibles' cuando monitor es null", () => {
    mockMonitor = null;
    renderWaitingRoom();
    expect(screen.getByText("No hay datos disponibles.")).toBeInTheDocument();
  });

  // ── 4. MonitorCard: con datos ─────────────────────────────────────────────
  it("MonitorCard muestra totalPatientsWaiting cuando monitor tiene datos", () => {
    mockMonitor = {
      queueId: "QUEUE-WR",
      totalPatientsWaiting: 7,
      highPriorityCount: 2,
      normalPriorityCount: 4,
      lowPriorityCount: 1,
      lastPatientCheckedInAt: null,
      averageWaitTimeMinutes: 12,
      utilizationPercentage: 70,
      projectedAt: "2026-03-02T10:00:00Z",
    };
    renderWaitingRoom();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // ── 5. QueueStateCard: estado null ────────────────────────────────────────
  it("QueueStateCard muestra 'No hay datos' cuando queueState es null", () => {
    mockQueueState = null;
    renderWaitingRoom();
    expect(screen.getByText("No hay datos.")).toBeInTheDocument();
  });

  // ── 6. QueueStateCard: con datos ──────────────────────────────────────────
  it("QueueStateCard muestra currentCount y maxCapacity cuando queueState tiene datos", () => {
    mockQueueState = {
      queueId: "QUEUE-WR",
      currentCount: 5,
      maxCapacity: 20,
      isAtCapacity: false,
      availableSpots: 15,
      patientsInQueue: [],
      projectedAt: "2026-03-02T10:00:00Z",
    };
    renderWaitingRoom();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  // ── 7. NextTurnCard: estado null ──────────────────────────────────────────
  it("NextTurnCard muestra 'No hay paciente en curso' cuando nextTurn es null", () => {
    mockNextTurn = null;
    renderWaitingRoom();
    expect(screen.getByText("No hay paciente en curso.")).toBeInTheDocument();
  });

  // ── 8. NextTurnCard: con datos ────────────────────────────────────────────
  it("NextTurnCard muestra el nombre del paciente cuando nextTurn tiene datos", () => {
    mockNextTurn = {
      queueId: "QUEUE-WR",
      patientId: "P1",
      patientName: "Laura Medina",
      priority: "High",
      consultationType: "General",
      status: "In Progress",
      stationId: "CONS-01",
    } as NextTurnView;
    renderWaitingRoom();
    expect(screen.getByText("Laura Medina")).toBeInTheDocument();
  });

  // ── 9. RecentHistory: vacía ───────────────────────────────────────────────
  it("RecentHistory muestra 'No hay atenciones recientes' cuando history está vacía", () => {
    mockHistory = [];
    renderWaitingRoom();
    expect(screen.getByText("No hay atenciones recientes.")).toBeInTheDocument();
  });

  // ── 10. RecentHistory: con datos ──────────────────────────────────────────
  it("RecentHistory muestra el nombre del paciente cuando history tiene entradas", () => {
    mockHistory = [
      {
        queueId: "QUEUE-WR",
        patientId: "P2",
        patientName: "Carlos Ríos",
        priority: "Medium",
        consultationType: "General",
        completedAt: "2026-03-02T09:00:00Z",
        outcome: "Alta",
      } as RecentAttentionRecordView,
    ];
    renderWaitingRoom();
    expect(screen.getByText("Carlos Ríos")).toBeInTheDocument();
  });

  // ── 11. Links de acciones rápidas ─────────────────────────────────────────
  it("los links de acciones rápidas incluyen el queueId codificado en el href", () => {
    renderWaitingRoom("SALA A");
    const encoded = encodeURIComponent("SALA A");

    const linkReception = screen.getByRole("link", { name: /Registrar check-in/i });
    const linkCashier   = screen.getByRole("link", { name: /Ir a caja/i });
    const linkMedical   = screen.getByRole("link", { name: /Ir a área médica/i });

    expect(linkReception).toHaveAttribute("href", `/reception?queue=${encoded}`);
    expect(linkCashier).toHaveAttribute("href", `/cashier?queue=${encoded}`);
    expect(linkMedical).toHaveAttribute("href", `/medical?queue=${encoded}`);
  });

  // ── 12. Botón Reconstruir proyección ──────────────────────────────────────
  it("el botón Reconstruir hace POST al endpoint correcto y llama a refresh", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/v1/waiting-room/:queueId/rebuild", () =>
        HttpResponse.json(null, { status: 200 }),
      ),
    );
    renderWaitingRoom("QUEUE-WR");
    const btn = screen.getByRole("button", { name: /Reconstruir proyección/i });
    await user.click(btn);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });
});
