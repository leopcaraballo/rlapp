/**
 * @jest-environment jsdom
 *
 * TDD RETROFIT — RED
 * Demuestra que el test de rama String(e) fallaría contra la implementación v0
 * de useConsultingRooms, la cual no convertía errores no-Error a string
 * (dejaba `error` como null cuando se lanzaba un valor que no era instanceof Error).
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Commit par (GREEN): test/hooks/hooks-core.coverage.spec.tsx
 */
import { act, renderHook } from "@testing-library/react";

// activateMock debe declararse antes de que jest.mock lo capture en su closure
const activateMock = jest.fn();

// ── v0 stub: hook sin String(e) — error queda null para valores no-Error ──
jest.mock("@/hooks/useConsultingRooms", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useState, useCallback } = require("react");

  return {
    useConsultingRooms: () => {
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null as string | null);
      const [lastResult, setLastResult] = useState(null as unknown);

      const activate = useCallback(async (queueId: string, stationId: string) => {
        setBusy(true);
        setError(null);
        try {
          await activateMock(queueId, stationId);
          setLastResult({ success: true });
          return true;
        } catch (e) {
          // v0: SOLO instanceof Error — no-Error values dejan error en null
          if (e instanceof Error) setError(e.message);
          return false;
        } finally {
          setBusy(false);
        }
      }, []);

      return { busy, error, lastResult, activate, deactivate: jest.fn(), clearError: jest.fn() };
    },
  };
});

import { useConsultingRooms } from "@/hooks/useConsultingRooms";

describe("useConsultingRooms.activate — RED (v0: sin String(e))", () => {
  beforeEach(() => {
    activateMock.mockReset();
  });

  // Comportamiento presente en v0 → pasa normalmente
  it("activa correctamente cuando la promesa resuelve", async () => {
    activateMock.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useConsultingRooms());
    await act(async () => {
      const ok = await result.current.activate("q1", "c1");
      expect(ok).toBe(true);
    });
    expect(result.current.error).toBeNull();
  });

  it("establece error con message cuando se lanza Error (funciona en v0)", async () => {
    activateMock.mockRejectedValue(new Error("fallo de red"));
    const { result } = renderHook(() => useConsultingRooms());
    await act(async () => {
      await result.current.activate("q1", "c1");
    });
    expect(result.current.error).toBe("fallo de red");
  });

  // Comportamiento NUEVO (String(e)) → falla contra v0 → evidencia RED
  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("error === 'error de red' cuando se lanza un string (v0 deja error en null)", async () => {
    activateMock.mockRejectedValue("error de red" as never);
    const { result } = renderHook(() => useConsultingRooms());
    await act(async () => {
      await result.current.activate("q1", "c1");
    });
    expect(result.current.error).toBe("error de red");
  });
});
