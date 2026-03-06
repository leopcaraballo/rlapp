/**
 * Cobertura de hooks de comandos: useCheckIn, useMedicalStation, useConsultingRooms.
 */
import { act, renderHook } from "@testing-library/react";

import { useCheckIn } from "@/hooks/useCheckIn";
import { useConsultingRooms } from "@/hooks/useConsultingRooms";
import { useMedicalStation } from "@/hooks/useMedicalStation";
import { httpCommandAdapter } from "@/infrastructure/adapters/HttpCommandAdapter";

// ---------------------------------------------------------------------------
// Mock del singleton HttpCommandAdapter
// ---------------------------------------------------------------------------
jest.mock("@/infrastructure/adapters/HttpCommandAdapter", () => ({
  HttpCommandAdapter: class {},
  httpCommandAdapter: {
    checkInPatient: jest.fn(),
    callNextAtCashier: jest.fn(),
    validatePayment: jest.fn(),
    markPaymentPending: jest.fn(),
    markAbsentAtCashier: jest.fn(),
    cancelByPayment: jest.fn(),
    claimNextPatient: jest.fn(),
    callPatient: jest.fn(),
    completeAttention: jest.fn(),
    markAbsentAtMedical: jest.fn(),
    activateConsultingRoom: jest.fn(),
    deactivateConsultingRoom: jest.fn(),
  },
}));

const mockAdapter = httpCommandAdapter as jest.Mocked<typeof httpCommandAdapter>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// useCheckIn
// ===========================================================================
describe("useCheckIn", () => {
  const input = { queueId: "q1", patientId: "p1", patientName: "Juan Pérez" };

  it("estado inicial: busy=false, error=null, lastResult=null", () => {
    const { result } = renderHook(() => useCheckIn());
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastResult).toBeNull();
  });

  it("checkIn exitoso actualiza lastResult y deja busy=false", async () => {
    mockAdapter.checkInPatient.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCheckIn());
    await act(async () => { await result.current.checkIn(input); });
    expect(result.current.busy).toBe(false);
    expect(result.current.lastResult).toEqual({ success: true });
    expect(result.current.error).toBeNull();
  });

  it("checkIn fallido establece error y deja busy=false", async () => {
    mockAdapter.checkInPatient.mockRejectedValue(new Error("fallo de red"));
    const { result } = renderHook(() => useCheckIn());
    await act(async () => { await result.current.checkIn(input); });
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBe("fallo de red");
  });

  it("checkIn con error no-Error usa String(e)", async () => {
    mockAdapter.checkInPatient.mockRejectedValue("error string");
    const { result } = renderHook(() => useCheckIn());
    await act(async () => { await result.current.checkIn(input); });
    expect(result.current.error).toBe("error string");
  });

  it("clearError limpia el error", async () => {
    mockAdapter.checkInPatient.mockRejectedValue(new Error("fallo"));
    const { result } = renderHook(() => useCheckIn());
    await act(async () => { await result.current.checkIn(input); });
    expect(result.current.error).toBe("fallo");
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });

  it("aplica valores por defecto: priority=Medium, consultationType=General, actor=reception", async () => {
    mockAdapter.checkInPatient.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCheckIn());
    await act(async () => { await result.current.checkIn(input); });
    expect(mockAdapter.checkInPatient).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "Medium", consultationType: "General", actor: "reception" }),
    );
  });

  it("usa los valores explícitos cuando se proveen", async () => {
    mockAdapter.checkInPatient.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useCheckIn());
    await act(async () => {
      await result.current.checkIn({
        ...input,
        priority: "Urgent",
        consultationType: "Specialist",
        actor: "doctor",
        age: 5,
        isPregnant: false,
        notes: "alergia",
      });
    });
    expect(mockAdapter.checkInPatient).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "Urgent", consultationType: "Specialist", actor: "doctor", age: 5, isPregnant: false, notes: "alergia" }),
    );
  });
});

// ===========================================================================
// useMedicalStation
// ===========================================================================
describe("useMedicalStation", () => {
  it("estado inicial correcto", () => {
    const { result } = renderHook(() => useMedicalStation());
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastResult).toBeNull();
  });

  it("claim exitoso actualiza lastResult", async () => {
    mockAdapter.claimNextPatient.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.claim({ queueId: "q1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
    expect(result.current.error).toBeNull();
  });

  it("claim con error establece mensaje", async () => {
    mockAdapter.claimNextPatient.mockRejectedValue(new Error("cola vacía"));
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.claim({ queueId: "q1" }); });
    expect(result.current.error).toBe("cola vacía");
  });

  it("claim usa actor DEFAULT_ACTOR cuando no se provee", async () => {
    mockAdapter.claimNextPatient.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.claim({ queueId: "q1" }); });
    expect(mockAdapter.claimNextPatient).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "doctor" }),
    );
  });

  it("call exitoso actualiza lastResult", async () => {
    mockAdapter.callPatient.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.call({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("complete exitoso actualiza lastResult", async () => {
    mockAdapter.completeAttention.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.complete({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("markAbsent exitoso actualiza lastResult", async () => {
    mockAdapter.markAbsentAtMedical.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.markAbsent({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("clearError limpia el error", async () => {
    mockAdapter.claimNextPatient.mockRejectedValue(new Error("fallo"));
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.claim({ queueId: "q1" }); });
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });

  it("error no-Error usa String(e)", async () => {
    mockAdapter.callPatient.mockRejectedValue("error literal");
    const { result } = renderHook(() => useMedicalStation());
    await act(async () => { await result.current.call({ queueId: "q1", patientId: "p1" }); });
    expect(result.current.error).toBe("error literal");
  });
});

// ===========================================================================
// useConsultingRooms
// ===========================================================================
describe("useConsultingRooms", () => {
  it("estado inicial correcto", () => {
    const { result } = renderHook(() => useConsultingRooms());
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("activate exitoso retorna true y actualiza lastResult", async () => {
    mockAdapter.activateConsultingRoom.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useConsultingRooms());
    let ret: boolean | undefined;
    await act(async () => { ret = await result.current.activate("q1", "c1"); });
    expect(ret).toBe(true);
    expect(result.current.lastResult).toEqual({ success: true });
  });

  it("activate con error retorna false y establece error", async () => {
    mockAdapter.activateConsultingRoom.mockRejectedValue(new Error("ya activo"));
    const { result } = renderHook(() => useConsultingRooms());
    let ret: boolean | undefined;
    await act(async () => { ret = await result.current.activate("q1", "c1"); });
    expect(ret).toBe(false);
    expect(result.current.error).toBe("ya activo");
  });

  it("deactivate exitoso retorna true", async () => {
    mockAdapter.deactivateConsultingRoom.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useConsultingRooms());
    let ret: boolean | undefined;
    await act(async () => { ret = await result.current.deactivate("q1", "c1"); });
    expect(ret).toBe(true);
  });

  it("deactivate con error retorna false", async () => {
    mockAdapter.deactivateConsultingRoom.mockRejectedValue(new Error("ya inactivo"));
    const { result } = renderHook(() => useConsultingRooms());
    let ret: boolean | undefined;
    await act(async () => { ret = await result.current.deactivate("q1", "c1"); });
    expect(ret).toBe(false);
    expect(result.current.error).toBe("ya inactivo");
  });

  it("usa actor DEFAULT_ACTOR cuando no se provee", async () => {
    mockAdapter.activateConsultingRoom.mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useConsultingRooms());
    await act(async () => { await result.current.activate("q1", "c1"); });
    expect(mockAdapter.activateConsultingRoom).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "admin" }),
    );
  });

  it("clearError limpia el error", async () => {
    mockAdapter.activateConsultingRoom.mockRejectedValue(new Error("fallo"));
    const { result } = renderHook(() => useConsultingRooms());
    await act(async () => { await result.current.activate("q1", "c1"); });
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });

  it("usa String(e) como mensaje cuando el error lanzado no es instanceof Error", async () => {
    mockAdapter.activateConsultingRoom.mockRejectedValue("error de red" as never);
    const { result } = renderHook(() => useConsultingRooms());
    await act(async () => { await result.current.activate("q1", "c1"); });
    expect(result.current.error).toBe("error de red");
  });
});
