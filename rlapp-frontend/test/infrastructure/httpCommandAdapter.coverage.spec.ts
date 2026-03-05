/**
 * Cobertura de HttpCommandAdapter.
 * Prueba todos los endpoints POST del adaptador de comandos HTTP.
 */

// Sobrescribir la var de entorno antes de importar el módulo
process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";

import { HttpCommandAdapter } from "@/infrastructure/adapters/HttpCommandAdapter";

// ---------------------------------------------------------------------------
// Helpers de mock fetch
// ---------------------------------------------------------------------------
function mockFetchOk(body: unknown = { success: true }) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  });
}

function mockFetchError(status: number, body: unknown = { error: "DomainViolation", message: "Queue is at maximum capacity" }) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status,
    statusText: "Bad Request",
    text: async () => JSON.stringify(body),
  });
}

function mockFetchEmpty() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 204,
    text: async () => "",
  });
}

describe("HttpCommandAdapter", () => {
  let adapter: HttpCommandAdapter;

  beforeEach(() => {
    global.fetch = jest.fn();
    adapter = new HttpCommandAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── checkInPatient ───────────────────────────────────────────────────────
  it("checkInPatient POST /api/reception/register y retorna resultado", async () => {
    mockFetchOk({ success: true });
    const result = await adapter.checkInPatient({
      queueId: "q1", patientId: "p1", patientName: "Juan",
      priority: "Medium", consultationType: "General", actor: "rx",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/reception/register"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual({ success: true });
  });

  it("checkInPatient lanza error traducido si el servidor responde 400", async () => {
    // POST-PR#51: translateApiError corto-circuita todos los 400 con mensaje genérico de validación
    mockFetchError(400, { error: "DomainViolation", message: "Queue is at maximum capacity" });
    await expect(
      adapter.checkInPatient({ queueId: "q1", patientId: "p1", patientName: "Ana", priority: "Low", consultationType: "General", actor: "rx" }),
    ).rejects.toThrow("La solicitud contiene datos invalidos. Verifique el formulario e intente nuevamente.");
  });

  // ─── callNextAtCashier ───────────────────────────────────────────────────
  it("callNextAtCashier POST /api/cashier/call-next", async () => {
    mockFetchOk({ patientId: "p1" });
    const result = await adapter.callNextAtCashier({ queueId: "q1", actor: "caja" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/cashier/call-next"), expect.any(Object));
    expect(result).toEqual({ patientId: "p1" });
  });

  // ─── validatePayment ────────────────────────────────────────────────────
  it("validatePayment POST /api/cashier/validate-payment", async () => {
    mockFetchOk();
    await adapter.validatePayment({ queueId: "q1", patientId: "p1", actor: "caja" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/cashier/validate-payment"), expect.any(Object));
  });

  // ─── markPaymentPending ─────────────────────────────────────────────────
  it("markPaymentPending POST /api/cashier/mark-payment-pending", async () => {
    mockFetchOk();
    await adapter.markPaymentPending({ queueId: "q1", patientId: "p1", actor: "caja" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/cashier/mark-payment-pending"), expect.any(Object));
  });

  // ─── markAbsentAtCashier ────────────────────────────────────────────────
  it("markAbsentAtCashier POST /api/cashier/mark-absent", async () => {
    mockFetchOk();
    await adapter.markAbsentAtCashier({ queueId: "q1", patientId: "p1", actor: "caja" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/cashier/mark-absent"), expect.any(Object));
  });

  // ─── cancelByPayment ────────────────────────────────────────────────────
  it("cancelByPayment POST /api/cashier/cancel-payment", async () => {
    mockFetchOk();
    await adapter.cancelByPayment({ queueId: "q1", patientId: "p1", actor: "caja" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/cashier/cancel-payment"), expect.any(Object));
  });

  // ─── claimNextPatient ───────────────────────────────────────────────────
  it("claimNextPatient POST /api/medical/call-next", async () => {
    mockFetchOk();
    await adapter.claimNextPatient({ queueId: "q1", actor: "doctor" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/medical/call-next"), expect.any(Object));
  });

  // ─── callPatient ────────────────────────────────────────────────────────
  it("callPatient POST /api/medical/start-consultation", async () => {
    mockFetchOk();
    await adapter.callPatient({ queueId: "q1", patientId: "p1", actor: "doctor" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/medical/start-consultation"), expect.any(Object));
  });

  // ─── completeAttention ──────────────────────────────────────────────────
  it("completeAttention POST /api/medical/finish-consultation", async () => {
    mockFetchOk();
    await adapter.completeAttention({ queueId: "q1", patientId: "p1", actor: "doctor" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/medical/finish-consultation"), expect.any(Object));
  });

  // ─── markAbsentAtMedical ────────────────────────────────────────────────
  it("markAbsentAtMedical POST /api/medical/mark-absent", async () => {
    mockFetchOk();
    await adapter.markAbsentAtMedical({ queueId: "q1", patientId: "p1", actor: "doctor" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/medical/mark-absent"), expect.any(Object));
  });

  // ─── activateConsultingRoom ─────────────────────────────────────────────
  it("activateConsultingRoom mapea stationId → consultingRoomId", async () => {
    mockFetchOk();
    await adapter.activateConsultingRoom({ queueId: "q1", stationId: "c1", actor: "admin" });
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.consultingRoomId).toBe("c1");
    expect(body.stationId).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/medical/consulting-room/activate"), expect.any(Object));
  });

  // ─── deactivateConsultingRoom ───────────────────────────────────────────
  it("deactivateConsultingRoom mapea stationId → consultingRoomId", async () => {
    mockFetchOk();
    await adapter.deactivateConsultingRoom({ queueId: "q1", stationId: "c2", actor: "admin" });
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.consultingRoomId).toBe("c2");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/medical/consulting-room/deactivate"), expect.any(Object));
  });

  // ─── respuesta vacía (204) ──────────────────────────────────────────────
  it("retorna null cuando el cuerpo está vacío (204)", async () => {
    mockFetchEmpty();
    const result = await adapter.claimNextPatient({ queueId: "q1", actor: "doctor" });
    expect(result).toBeNull();
  });

  // ─── fallback error sin body ────────────────────────────────────────────
  it("usa statusText como fallback cuando body de error está vacío", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "",
    });
    await expect(
      adapter.claimNextPatient({ queueId: "q1", actor: "doctor" }),
    ).rejects.toThrow();
  });

  // ─── error de red ───────────────────────────────────────────────────────
  it("propaga errores de red (fetch lanza)", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    await expect(
      adapter.checkInPatient({ queueId: "q1", patientId: "p1", patientName: "x", priority: "Low", consultationType: "General", actor: "rx" }),
    ).rejects.toThrow("Network error");
  });

  // ─── headers ─────────────────────────────────────────────────────────────
  it("envía Content-Type y X-Correlation-Id en el header", async () => {
    mockFetchOk();
    await adapter.callNextAtCashier({ queueId: "q1", actor: "caja" });
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Correlation-Id"]).toBeTruthy();
    // POST-PR#51: header renombrado de X-Idempotency-Key a Idempotency-Key (sin prefijo X-)
    expect(headers["Idempotency-Key"]).toBeTruthy();
  });
});
