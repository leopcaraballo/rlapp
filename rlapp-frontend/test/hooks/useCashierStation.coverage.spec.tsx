/**
 * Cobertura de useCashierStation.
 */
import { act, renderHook } from "@testing-library/react";

import { useCashierStation } from "@/hooks/useCashierStation";
import { httpCommandAdapter } from "@/infrastructure/adapters/HttpCommandAdapter";

jest.mock("@/infrastructure/adapters/HttpCommandAdapter", () => ({
  HttpCommandAdapter: class {},
  httpCommandAdapter: {
    callNextAtCashier: jest.fn(),
    validatePayment: jest.fn(),
    markPaymentPending: jest.fn(),
    markAbsentAtCashier: jest.fn(),
    cancelByPayment: jest.fn(),
  },
}));

const mockAdapter = httpCommandAdapter as jest.Mocked<typeof httpCommandAdapter>;

beforeEach(() => jest.clearAllMocks());

describe("useCashierStation", () => {
  it("estado inicial: busy=false, error=null, lastResult=null", () => {
    const { result } = renderHook(() => useCashierStation());
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastResult).toBeNull();
  });

  // ─── callNext ───────────────────────────────────────────────────────────
  it("callNext exitoso actualiza lastResult", async () => {
    mockAdapter.callNextAtCashier.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.callNext("q1"); });
    expect(result.current.lastResult).toEqual({ success: true });
    expect(result.current.error).toBeNull();
  });

  it("callNext usa DEFAULT_ACTOR='cashier' cuando no se provee", async () => {
    mockAdapter.callNextAtCashier.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.callNext("q1"); });
    expect(mockAdapter.callNextAtCashier).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "cashier", cashierDeskId: null }),
    );
  });

  it("callNext acepta actor y cashierDeskId explícitos", async () => {
    mockAdapter.callNextAtCashier.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.callNext("q1", "caja2", "desk-1"); });
    expect(mockAdapter.callNextAtCashier).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "caja2", cashierDeskId: "desk-1" }),
    );
  });

  it("callNext con error establece mensaje de error", async () => {
    mockAdapter.callNextAtCashier.mockRejectedValue(new Error("sin pacientes"));
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.callNext("q1"); });
    expect(result.current.error).toBe("sin pacientes");
    expect(result.current.busy).toBe(false);
  });

  it("callNext con error no-Error usa String(e)", async () => {
    mockAdapter.callNextAtCashier.mockRejectedValue("error literal");
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.callNext("q1"); });
    expect(result.current.error).toBe("error literal");
  });

  // ─── validate ───────────────────────────────────────────────────────────
  it("validate exitoso actualiza lastResult", async () => {
    mockAdapter.validatePayment.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.validate({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("validate usa DEFAULT_ACTOR cuando no se provee", async () => {
    mockAdapter.validatePayment.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.validate({ queueId: "q1", patientId: "p1" }); });
    expect(mockAdapter.validatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "cashier" }),
    );
  });

  it("validate con error establece mensaje", async () => {
    mockAdapter.validatePayment.mockRejectedValue(new Error("pago inválido"));
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.validate({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.error).toBe("pago inválido");
  });

  // ─── markPending ─────────────────────────────────────────────────────────
  it("markPending exitoso actualiza lastResult", async () => {
    mockAdapter.markPaymentPending.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.markPending({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("markPending con error establece mensaje", async () => {
    mockAdapter.markPaymentPending.mockRejectedValue(new Error("reintentos agotados"));
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.markPending({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.error).toBe("reintentos agotados");
  });

  // ─── markAbsent ───────────────────────────────────────────────────────────
  it("markAbsent exitoso actualiza lastResult", async () => {
    mockAdapter.markAbsentAtCashier.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.markAbsent({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("markAbsent con error establece mensaje", async () => {
    mockAdapter.markAbsentAtCashier.mockRejectedValue(new Error("ausente previamente"));
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.markAbsent({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.error).toBe("ausente previamente");
  });

  // ─── cancel ───────────────────────────────────────────────────────────────
  it("cancel exitoso actualiza lastResult", async () => {
    mockAdapter.cancelByPayment.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.cancel({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("cancel con error establece mensaje", async () => {
    mockAdapter.cancelByPayment.mockRejectedValue(new Error("cancelación rechazada"));
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.cancel({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.error).toBe("cancelación rechazada");
  });

  // ─── clearError ───────────────────────────────────────────────────────────
  it("clearError limpia el error", async () => {
    mockAdapter.callNextAtCashier.mockRejectedValue(new Error("fallo"));
    const { result } = renderHook(() => useCashierStation());
    await act(async () => { await result.current.callNext("q1"); });
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });
});
