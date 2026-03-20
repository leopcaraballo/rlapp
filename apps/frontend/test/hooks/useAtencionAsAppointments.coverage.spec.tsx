/**
 * Cobertura de useAtencionAsAppointments.
 * Verifica el mapeo de estados de conexión, prioridades, nextTurn,
 * patientsInQueue e historial a objetos Appointment.
 */
import { renderHook } from "@testing-library/react";

import { useAtencionAsAppointments } from "@/hooks/useAtencionAsAppointments";
import { useAtencion } from "@/hooks/useAtencion";

// ---------------------------------------------------------------------------
// Mock de useAtencion
// ---------------------------------------------------------------------------
jest.mock("@/hooks/useAtencion");

const mockUseAtencion = useAtencion as jest.MockedFunction<typeof useAtencion>;

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------
function makeQueueState(patients: object[] = []) {
  return {
    serviceId: "q1",
    currentCount: patients.length,
    maxCapacity: 10,
    isAtCapacity: false,
    availableSpots: 10 - patients.length,
    patientsInQueue: patients,
    projectedAt: "2026-03-02T10:00:00Z",
  };
}

function makePatient(overrides = {}) {
  return {
    patientId: "p1",
    patientName: "Juan Pérez",
    priority: "Medium",
    checkInTime: "2026-03-02T09:00:00Z",
    waitTimeMinutes: 10,
    ...overrides,
  };
}

function makeNextTurn(overrides = {}) {
  return {
    serviceId: "q1",
    patientId: "p1",
    patientName: "Juan Pérez",
    priority: "High",
    consultationType: "General",
    status: "called",
    claimedAt: null,
    calledAt: "2026-03-02T09:30:00Z",
    stationId: "C1",
    projectedAt: "2026-03-02T10:00:00Z",
    ...overrides,
  };
}

function makeHistory(overrides = {}) {
  return {
    serviceId: "q1",
    patientId: "p2",
    patientName: "Ana López",
    priority: "Low",
    consultationType: "General",
    completedAt: "2026-03-02T09:45:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useAtencionAsAppointments — estado de conexión", () => {
  it.each([
    ["online", true, false, "connected"],
    ["connecting", false, true, "connecting"],
    ["degraded", false, false, "disconnected"],
    ["offline", false, false, "disconnected"],
  ] as const)(
    "connectionState=%s → connected=%s isConnecting=%s status=%s",
    (state, expectedConnected, expectedConnecting, expectedStatus) => {
      mockUseAtencion.mockReturnValue({
        queueState: null,
        nextTurn: null,
        history: [],
        connectionState: state,
        monitor: null,
        fullState: null,
        lastUpdated: null,
        refresh: jest.fn(),
        setMonitor: jest.fn(),
        setQueueState: jest.fn(),
        setFullState: jest.fn(),
        setNextTurn: jest.fn(),
      } as unknown as ReturnType<typeof useAtencion>);

      const { result } = renderHook(() => useAtencionAsAppointments("q1"));
      expect(result.current.connected).toBe(expectedConnected);
      expect(result.current.isConnecting).toBe(expectedConnecting);
      expect(result.current.connectionStatus).toBe(expectedStatus);
    },
  );

  it("error es null cuando connectionState=online", () => {
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: null,
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.error).toBeNull();
  });

  it("error contiene mensaje cuando connectionState=degraded", () => {
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: null,
      history: [],
      connectionState: "degraded",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.error).toMatch(/sin conexión/i);
  });
});

describe("useAtencionAsAppointments — mapeo de appointments", () => {
  it("retorna lista vacía cuando no hay datos", () => {
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: null,
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.appointments).toHaveLength(0);
  });

  it("mapea nextTurn a appointment con status=called", () => {
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: makeNextTurn(),
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    const [appt] = result.current.appointments;
    expect(appt.status).toBe("called");
    expect(appt.fullName).toBe("Juan Pérez");
    expect(appt.office).toBe("C1");
    expect(appt.priority).toBe("High");
  });

  it("nextTurn sin calledAt usa Date.now()", () => {
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: makeNextTurn({ calledAt: null }),
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const before = Date.now();
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    const after = Date.now();
    const ts = result.current.appointments[0].timestamp;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("paciente en cola es omitido si ya es el nextTurn", () => {
    const patient = makePatient({ patientId: "p1" });
    mockUseAtencion.mockReturnValue({
      queueState: makeQueueState([patient]),
      nextTurn: makeNextTurn({ patientId: "p1" }),
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    // Solo 1 appointment (el nextTurn, no duplicado)
    expect(result.current.appointments).toHaveLength(1);
    expect(result.current.appointments[0].status).toBe("called");
  });

  it("mapea patientsInQueue a appointments con status=waiting", () => {
    mockUseAtencion.mockReturnValue({
      queueState: makeQueueState([makePatient({ patientId: "p2", patientName: "María" })]),
      nextTurn: null,
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.appointments[0].status).toBe("waiting");
    expect(result.current.appointments[0].fullName).toBe("María");
  });

  it("paciente en cola sin checkInTime usa waitTimeMinutes", () => {
    const patient = makePatient({ checkInTime: null as unknown as string, waitTimeMinutes: 5 });
    mockUseAtencion.mockReturnValue({
      queueState: makeQueueState([patient]),
      nextTurn: null,
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.appointments[0].timestamp).toBeLessThan(Date.now());
  });

  it("mapea history a appointments con status=completed", () => {
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: null,
      history: [makeHistory()],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.appointments[0].status).toBe("completed");
    expect(result.current.appointments[0].fullName).toBe("Ana López");
    expect(result.current.appointments[0].priority).toBe("Low");
  });

  it("history usa 'Medium' como prioridad por defecto si es null", () => {
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: null,
      history: [makeHistory({ priority: null as unknown as string })],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.appointments[0].priority).toBe("Medium");
  });

  it("evita duplicados en history por compositeId", () => {
    const h = makeHistory({ patientId: "p2", completedAt: "2026-03-02T09:45:00Z" });
    const compositeId = "p2-2026-03-02T09:45:00Z";
    // Simular que ya existe en appointments (nextTurn con ese mismo compositeId)
    // Aquí basta con dos entradas iguales en history para verificar deduplicación:
    // El segundo con el mismo compositeId debe ser ignorado
    mockUseAtencion.mockReturnValue({
      queueState: null,
      nextTurn: null,
      history: [h, h],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    // Ambos tienen el mismo compositeId, el 2do debe ser ignorado
    expect(result.current.appointments).toHaveLength(1);
    void compositeId;
  });
});

describe("useAtencionAsAppointments — mapeo de prioridades", () => {
  it.each([
    ["urgent", "Urgent"],
    ["high", "High"],
    ["low", "Low"],
    ["medium", "Medium"],
    ["unknown", "Medium"],
    [null, "Medium"],
    [undefined, "Medium"],
  ])("priority='%s' → '%s'", (raw, expected) => {
    mockUseAtencion.mockReturnValue({
      queueState: makeQueueState([makePatient({ priority: raw as string })]),
      nextTurn: null,
      history: [],
      connectionState: "online",
      monitor: null,
      fullState: null,
      lastUpdated: null,
      refresh: jest.fn(),
      setMonitor: jest.fn(),
      setQueueState: jest.fn(),
      setFullState: jest.fn(),
      setNextTurn: jest.fn(),
    } as unknown as ReturnType<typeof useAtencion>);
    const { result } = renderHook(() => useAtencionAsAppointments("q1"));
    expect(result.current.appointments[0].priority).toBe(expected);
  });
});
