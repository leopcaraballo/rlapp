/**
 * @jest-environment jsdom
 *
 * 🧪 Tests de cobertura para services/api/waitingRoom (Bloque B3)
 * Cubre: getMonitor, getQueueState, getNextTurn, getRecentHistory, rebuildProjection,
 * checkInPatient (postCommand + evento), callNextCashier, activateConsultingRoom, markAbsent.
 * Usa global.fetch mock (mismo patrón que adapters.coverage.spec.ts).
 */

const setApiTestEnv = () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
};

type FetchMock = jest.Mock;

function mockFetchOk(body: unknown, status = 200) {
  (global as unknown as { fetch: FetchMock }).fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

function mockFetchError(status: number, body: unknown) {
  (global as unknown as { fetch: FetchMock }).fetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify(body),
  });
}

// ── suite ─────────────────────────────────────────────────────────────────────
describe("services/api/waitingRoom", () => {
  beforeEach(() => {
    jest.resetModules();
    setApiTestEnv();
    (global as unknown as { fetch: FetchMock }).fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getMonitor ─────────────────────────────────────────────────────────────
  describe("getMonitor", () => {
    it("devuelve WaitingRoomMonitorView cuando el servidor responde 200", async () => {
      const { getMonitor } = await import("@/services/api/waitingRoom");
      mockFetchOk({
        queueId: "QUEUE-1",
        totalPatientsWaiting: 3,
        highPriorityCount: 1,
        normalPriorityCount: 2,
        lowPriorityCount: 0,
        lastPatientCheckedInAt: null,
        averageWaitTimeMinutes: 5,
        utilizationPercentage: 30,
        projectedAt: "2026-03-02T10:00:00Z",
      });
      const result = await getMonitor("QUEUE-1");
      expect(result.queueId).toBe("QUEUE-1");
      expect(result.totalPatientsWaiting).toBe(3);
      expect(result.highPriorityCount).toBe(1);
    });

    it("lanza error con status cuando el servidor responde 500", async () => {
      const { getMonitor } = await import("@/services/api/waitingRoom");
      mockFetchError(500, { error: "Internal Server Error" });
      await expect(getMonitor("QUEUE-1")).rejects.toThrow();
    });

    it("incluye X-Correlation-Id en la cabecera de la petición", async () => {
      const { getMonitor } = await import("@/services/api/waitingRoom");
      mockFetchOk({
        queueId: "QUEUE-1",
        totalPatientsWaiting: 0,
        highPriorityCount: 0,
        normalPriorityCount: 0,
        lowPriorityCount: 0,
        lastPatientCheckedInAt: null,
        averageWaitTimeMinutes: 0,
        utilizationPercentage: 0,
        projectedAt: "2026-03-02T10:00:00Z",
      });
      await getMonitor("QUEUE-1");
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      const calledHeaders = fetchMock.mock.calls[0][1]?.headers ?? {};
      expect(calledHeaders["X-Correlation-Id"]).toBeTruthy();
    });

    it("llama a la URL que contiene el queueId y el endpoint monitor", async () => {
      const { getMonitor } = await import("@/services/api/waitingRoom");
      mockFetchOk({ queueId: "Q2", totalPatientsWaiting: 0, highPriorityCount: 0, normalPriorityCount: 0, lowPriorityCount: 0, lastPatientCheckedInAt: null, averageWaitTimeMinutes: 0, utilizationPercentage: 0, projectedAt: "" });
      await getMonitor("Q2");
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("Q2");
      expect(fetchMock.mock.calls[0][0]).toContain("monitor");
    });
  });

  // ── getQueueState ──────────────────────────────────────────────────────────
  describe("getQueueState", () => {
    it("devuelve QueueStateView cuando el servidor responde 200", async () => {
      const { getQueueState } = await import("@/services/api/waitingRoom");
      mockFetchOk({
        queueId: "QUEUE-1",
        currentCount: 5,
        maxCapacity: 20,
        isAtCapacity: false,
        availableSpots: 15,
        patientsInQueue: [],
        projectedAt: "2026-03-02T10:00:00Z",
      });
      const result = await getQueueState("QUEUE-1");
      expect(result.currentCount).toBe(5);
      expect(result.maxCapacity).toBe(20);
    });

    it("lanza error cuando el servidor responde 500", async () => {
      const { getQueueState } = await import("@/services/api/waitingRoom");
      mockFetchError(500, { error: "Internal Server Error" });
      await expect(getQueueState("QUEUE-1")).rejects.toThrow();
    });
  });

  // ── getNextTurn ────────────────────────────────────────────────────────────
  describe("getNextTurn", () => {
    it("devuelve NextTurnView cuando hay un turno activo (200)", async () => {
      const { getNextTurn } = await import("@/services/api/waitingRoom");
      mockFetchOk({
        queueId: "QUEUE-1",
        patientId: "p1",
        patientName: "Ana",
        priority: "High",
        consultationType: "General",
        status: "Called",
        claimedAt: null,
        calledAt: "2026-03-02T10:00:00Z",
        stationId: null,
        projectedAt: "2026-03-02T10:00:00Z",
      });
      const result = await getNextTurn("QUEUE-1");
      expect(result?.patientName).toBe("Ana");
    });

    it("devuelve null cuando la cola no tiene turno activo (404)", async () => {
      const { getNextTurn } = await import("@/services/api/waitingRoom");
      (global as unknown as { fetch: FetchMock }).fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "",
      });
      const result = await getNextTurn("QUEUE-1");
      expect(result).toBeNull();
    });

    it("lanza error cuando el servidor responde 500", async () => {
      const { getNextTurn } = await import("@/services/api/waitingRoom");
      mockFetchError(500, { error: "Internal Server Error" });
      await expect(getNextTurn("QUEUE-1")).rejects.toThrow();
    });
  });

  // ── getRecentHistory ───────────────────────────────────────────────────────
  describe("getRecentHistory", () => {
    it("devuelve array de RecentAttentionRecordView cuando responde 200", async () => {
      const { getRecentHistory } = await import("@/services/api/waitingRoom");
      mockFetchOk([
        {
          queueId: "QUEUE-1",
          patientId: "p0",
          patientName: "Carlos",
          priority: "Low",
          consultationType: "General",
          completedAt: "2026-03-02T09:00:00Z",
        },
      ]);
      const result = await getRecentHistory("QUEUE-1");
      expect(result).toHaveLength(1);
      expect(result[0].patientName).toBe("Carlos");
    });

    it("pasa el parámetro limit en la URL", async () => {
      const { getRecentHistory } = await import("@/services/api/waitingRoom");
      mockFetchOk([]);
      await getRecentHistory("QUEUE-1", 50);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("limit=50");
    });

    it("devuelve array vacío cuando no hay historial", async () => {
      const { getRecentHistory } = await import("@/services/api/waitingRoom");
      mockFetchOk([]);
      const result = await getRecentHistory("QUEUE-1");
      expect(result).toEqual([]);
    });
  });

  // ── rebuildProjection ──────────────────────────────────────────────────────
  describe("rebuildProjection", () => {
    it("devuelve mensaje de éxito cuando el servidor responde 200", async () => {
      const { rebuildProjection } = await import("@/services/api/waitingRoom");
      mockFetchOk({ message: "Proyección reconstruida correctamente", queueId: "QUEUE-1" });
      const result = await rebuildProjection("QUEUE-1");
      expect(result.message).toMatch(/proyecci/i);
      expect(result.queueId).toBe("QUEUE-1");
    });

    it("usa método POST en la petición", async () => {
      const { rebuildProjection } = await import("@/services/api/waitingRoom");
      mockFetchOk({ message: "ok", queueId: "QUEUE-1" });
      await rebuildProjection("QUEUE-1");
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    });

    it("lanza error cuando el servidor responde 503", async () => {
      const { rebuildProjection } = await import("@/services/api/waitingRoom");
      mockFetchError(503, { error: "Service Unavailable" });
      await expect(rebuildProjection("QUEUE-1")).rejects.toThrow();
    });

    it("incluye X-Idempotency-Key y X-Correlation-Id en encabezados", async () => {
      const { rebuildProjection } = await import("@/services/api/waitingRoom");
      mockFetchOk({ message: "ok", queueId: "QUEUE-1" });
      await rebuildProjection("QUEUE-1");
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      const headers = fetchMock.mock.calls[0][1]?.headers ?? {};
      // POST-PR#51: header renombrado de X-Idempotency-Key a Idempotency-Key (sin prefijo X-)
      expect(headers["Idempotency-Key"]).toBeTruthy();
      expect(headers["X-Correlation-Id"]).toBeTruthy();
    });
  });

  // ── checkInPatient (postCommand) ───────────────────────────────────────────
  describe("checkInPatient", () => {
    it("llama a POST con el body serializado y devuelve CommandSuccess", async () => {
      const { checkInPatient } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      const dto = { queueId: "QUEUE-1", patientId: "P1", actor: "nurse" };
      const result = await checkInPatient(dto as Parameters<typeof checkInPatient>[0]);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
      expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({ queueId: "QUEUE-1" });
      expect(result).toMatchObject({ success: true });
    });

    it("despacha el evento rlapp:command-success tras éxito", async () => {
      const { checkInPatient } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      const events: Event[] = [];
      window.addEventListener("rlapp:command-success", (e) => events.push(e));
      const dto = { queueId: "QUEUE-X", patientId: "P2", actor: "nurse" };
      await checkInPatient(dto as Parameters<typeof checkInPatient>[0]);
      window.removeEventListener("rlapp:command-success", (e) => events.push(e));
      expect(events.length).toBe(1);
      expect((events[0] as CustomEvent<{ queueId: string }>).detail.queueId).toBe("QUEUE-X");
    });

    it("lanza error cuando el servidor responde 400", async () => {
      const { checkInPatient } = await import("@/services/api/waitingRoom");
      mockFetchError(400, { error: "Bad Request" });
      const dto = { queueId: "QUEUE-1", patientId: "P1", actor: "nurse" };
      await expect(checkInPatient(dto as Parameters<typeof checkInPatient>[0])).rejects.toThrow();
    });
  });

  // ── callNextCashier ────────────────────────────────────────────────────────
  describe("callNextCashier", () => {
    it("llama al path correcto con método POST", async () => {
      const { callNextCashier } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await callNextCashier({ queueId: "QUEUE-1", actor: "cashier" } as Parameters<typeof callNextCashier>[0]);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/cashier/call-next");
      expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    });
  });

  // ── activateConsultingRoom ────────────────────────────────────────────────
  describe("activateConsultingRoom", () => {
    it("convierte stationId a consultingRoomId en el body", async () => {
      const { activateConsultingRoom } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await activateConsultingRoom({ queueId: "Q1", actor: "doctor", stationId: "ROOM-1" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.consultingRoomId).toBe("ROOM-1");
      expect(body.stationId).toBeUndefined();
    });

    it("envía consultingRoomId null cuando stationId es undefined", async () => {
      const { activateConsultingRoom } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await activateConsultingRoom({ queueId: "Q1", actor: "doctor" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.consultingRoomId).toBeNull();
    });
  });

  // ── markAbsent (alias) ────────────────────────────────────────────────────
  describe("markAbsent (alias → markAbsentAtCashier)", () => {
    it("delega a markAbsentAtCashier usando la ruta correcta", async () => {
      const { markAbsent } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await markAbsent({ queueId: "Q1", patientId: "P1", actor: "cashier" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/cashier/mark-absent");
    });
  });

  // ── dispatchAuthInvalid (401 / 403) ───────────────────────────────────────
  describe("handleResponse — dispatchAuthInvalid", () => {
    it("despacha 'unauthorized' cuando el servidor responde 401", async () => {
      const { getMonitor } = await import("@/services/api/waitingRoom");
      mockFetchError(401, { error: "Unauthorized" });
      const events: CustomEvent[] = [];
      const listener = (e: Event) => events.push(e as CustomEvent);
      window.addEventListener("rlapp:auth-invalid", listener);
      await expect(getMonitor("Q1")).rejects.toThrow();
      window.removeEventListener("rlapp:auth-invalid", listener);
      expect(events).toHaveLength(1);
      expect(events[0].detail).toMatchObject({ reason: "unauthorized", status: 401 });
    });

    it("despacha 'forbidden' cuando el servidor responde 403", async () => {
      const { getMonitor } = await import("@/services/api/waitingRoom");
      mockFetchError(403, { error: "Forbidden" });
      const events: CustomEvent[] = [];
      const listener = (e: Event) => events.push(e as CustomEvent);
      window.addEventListener("rlapp:auth-invalid", listener);
      await expect(getMonitor("Q1")).rejects.toThrow();
      window.removeEventListener("rlapp:auth-invalid", listener);
      expect(events).toHaveLength(1);
      expect(events[0].detail).toMatchObject({ reason: "forbidden", status: 403 });
    });
  });

  // ── registerReception ─────────────────────────────────────────────────────
  describe("registerReception", () => {
    it("llama a POST /api/reception/register con el body correcto", async () => {
      const { registerReception } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      const dto = { queueId: "Q1", patientId: "P1", actor: "nurse" } as Parameters<typeof registerReception>[0];
      await registerReception(dto);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/reception/register");
      expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    });
  });

  // ── validatePayment ───────────────────────────────────────────────────────
  describe("validatePayment", () => {
    it("llama a POST /api/cashier/validate-payment", async () => {
      const { validatePayment } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      const dto = { queueId: "Q1", patientId: "P1", actor: "cashier" } as Parameters<typeof validatePayment>[0];
      await validatePayment(dto);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/cashier/validate-payment");
    });
  });

  // ── markPaymentPending ────────────────────────────────────────────────────
  describe("markPaymentPending", () => {
    it("llama a POST /api/cashier/mark-payment-pending", async () => {
      const { markPaymentPending } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      const dto = { queueId: "Q1", patientId: "P1", actor: "cashier" } as Parameters<typeof markPaymentPending>[0];
      await markPaymentPending(dto);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/cashier/mark-payment-pending");
    });
  });

  // ── markAbsentAtCashier ───────────────────────────────────────────────────
  describe("markAbsentAtCashier", () => {
    it("llama a POST /api/cashier/mark-absent", async () => {
      const { markAbsentAtCashier } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await markAbsentAtCashier({ queueId: "Q1", patientId: "P1", actor: "cashier" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/cashier/mark-absent");
    });
  });

  // ── cancelByPayment ───────────────────────────────────────────────────────
  describe("cancelByPayment", () => {
    it("llama a POST /api/cashier/cancel-payment", async () => {
      const { cancelByPayment } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await cancelByPayment({ queueId: "Q1", patientId: "P1", actor: "cashier" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/cashier/cancel-payment");
    });
  });

  // ── cancelPayment (alias) ─────────────────────────────────────────────────
  describe("cancelPayment (alias → cancelByPayment)", () => {
    it("delega a cancelByPayment usando la ruta correcta", async () => {
      const { cancelPayment } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await cancelPayment({ queueId: "Q1", patientId: "P1", actor: "cashier" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/cashier/cancel-payment");
    });
  });

  // ── claimNextPatient ──────────────────────────────────────────────────────
  describe("claimNextPatient", () => {
    it("llama a POST /api/waiting-room/claim-next", async () => {
      const { claimNextPatient } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      const dto = { queueId: "Q1", actor: "doctor", stationId: "ROOM-1" } as Parameters<typeof claimNextPatient>[0];
      await claimNextPatient(dto);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/waiting-room/claim-next");
    });
  });

  // ── callPatient ───────────────────────────────────────────────────────────
  describe("callPatient", () => {
    it("llama a POST /api/waiting-room/call-patient", async () => {
      const { callPatient } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await callPatient({ queueId: "Q1", patientId: "P1", actor: "doctor" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/waiting-room/call-patient");
    });
  });

  // ── completeAttention ─────────────────────────────────────────────────────
  describe("completeAttention", () => {
    it("llama a POST /api/waiting-room/complete-attention", async () => {
      const { completeAttention } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      const dto = { queueId: "Q1", patientId: "P1", actor: "doctor" } as Parameters<typeof completeAttention>[0];
      await completeAttention(dto);
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/waiting-room/complete-attention");
    });
  });

  // ── callNextMedical ───────────────────────────────────────────────────────
  describe("callNextMedical", () => {
    it("llama a POST /api/medical/call-next", async () => {
      const { callNextMedical } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await callNextMedical({ queueId: "Q1", actor: "doctor" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/medical/call-next");
    });
  });

  // ── deactivateConsultingRoom ──────────────────────────────────────────────
  describe("deactivateConsultingRoom", () => {
    it("convierte stationId a consultingRoomId y llama a POST correcto", async () => {
      const { deactivateConsultingRoom } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await deactivateConsultingRoom({ queueId: "Q1", actor: "doctor", stationId: "ROOM-2" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/medical/consulting-room/deactivate");
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.consultingRoomId).toBe("ROOM-2");
    });

    it("envía consultingRoomId null cuando stationId es undefined", async () => {
      const { deactivateConsultingRoom } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await deactivateConsultingRoom({ queueId: "Q1", actor: "doctor" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.consultingRoomId).toBeNull();
    });
  });

  // ── startConsultation ─────────────────────────────────────────────────────
  describe("startConsultation", () => {
    it("llama a POST /api/medical/start-consultation", async () => {
      const { startConsultation } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await startConsultation({ queueId: "Q1", patientId: "P1", actor: "doctor" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/medical/start-consultation");
    });
  });

  // ── finishConsultation ────────────────────────────────────────────────────
  describe("finishConsultation", () => {
    it("llama a POST /api/medical/finish-consultation", async () => {
      const { finishConsultation } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await finishConsultation({ queueId: "Q1", patientId: "P1", actor: "doctor" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/medical/finish-consultation");
    });
  });

  // ── markAbsentMedical ─────────────────────────────────────────────────────
  describe("markAbsentMedical", () => {
    it("llama a POST /api/medical/mark-absent", async () => {
      const { markAbsentMedical } = await import("@/services/api/waitingRoom");
      mockFetchOk({ success: true });
      await markAbsentMedical({ queueId: "Q1", patientId: "P1", actor: "doctor" });
      const fetchMock = (global as unknown as { fetch: FetchMock }).fetch;
      expect(fetchMock.mock.calls[0][0]).toContain("/api/medical/mark-absent");
    });
  });
});
