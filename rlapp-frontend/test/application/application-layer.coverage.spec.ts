/**
 * Cobertura de la capa de aplicación — delegados al gateway.
 * Cubre: CashierUseCases, MedicalUseCases, ConsultingRoomUseCases,
 *        CheckInPatientUseCase y PatientState (dominio).
 */
import { cancelByPayment, callNextAtCashier, markAbsentAtCashier, markPaymentPending, validatePayment } from "@/application/cashier/CashierUseCases";
import { activateConsultingRoom, deactivateConsultingRoom } from "@/application/consulting-rooms/ConsultingRoomUseCases";
import { callPatient, claimNextPatient, completeAttention, markAbsentAtMedical } from "@/application/medical/MedicalUseCases";
import { checkInPatient } from "@/application/reception/CheckInPatientUseCase";
import { PATIENT_STATE_LABELS, isTerminalState } from "@/domain/patient/PatientState";
import type { ICommandGateway } from "@/domain/ports/ICommandGateway";

// ---------------------------------------------------------------------------
// Fábrica de gateway mock
// ---------------------------------------------------------------------------
function makeGateway(): jest.Mocked<ICommandGateway> {
  return {
    checkInPatient: jest.fn().mockResolvedValue({ success: true }),
    callNextAtCashier: jest.fn().mockResolvedValue({ success: true }),
    validatePayment: jest.fn().mockResolvedValue({ success: true }),
    markPaymentPending: jest.fn().mockResolvedValue({ success: true }),
    markAbsentAtCashier: jest.fn().mockResolvedValue({ success: true }),
    cancelByPayment: jest.fn().mockResolvedValue({ success: true }),
    claimNextPatient: jest.fn().mockResolvedValue({ success: true }),
    callPatient: jest.fn().mockResolvedValue({ success: true }),
    completeAttention: jest.fn().mockResolvedValue({ success: true }),
    markAbsentAtMedical: jest.fn().mockResolvedValue({ success: true }),
    activateConsultingRoom: jest.fn().mockResolvedValue({ success: true }),
    deactivateConsultingRoom: jest.fn().mockResolvedValue({ success: true }),
  } as jest.Mocked<ICommandGateway>;
}

// ---------------------------------------------------------------------------
// CashierUseCases
// ---------------------------------------------------------------------------
describe("CashierUseCases", () => {
  it("callNextAtCashier delega al gateway y retorna resultado", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", actor: "caja1" };
    const result = await callNextAtCashier(gw, cmd);
    expect(gw.callNextAtCashier).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("validatePayment delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", patientId: "p1", actor: "caja1" };
    const result = await validatePayment(gw, cmd);
    expect(gw.validatePayment).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("markPaymentPending delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", patientId: "p1", actor: "caja1", reason: "sin efectivo" };
    const result = await markPaymentPending(gw, cmd);
    expect(gw.markPaymentPending).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("markAbsentAtCashier delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", patientId: "p1", actor: "caja1" };
    const result = await markAbsentAtCashier(gw, cmd);
    expect(gw.markAbsentAtCashier).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("cancelByPayment delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", patientId: "p1", actor: "caja1" };
    const result = await cancelByPayment(gw, cmd);
    expect(gw.cancelByPayment).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("propaga el error del gateway", async () => {
    const gw = makeGateway();
    gw.callNextAtCashier.mockRejectedValue(new Error("sin pacientes"));
    await expect(callNextAtCashier(gw, { queueId: "q1", actor: "caja1" })).rejects.toThrow("sin pacientes");
  });
});

// ---------------------------------------------------------------------------
// MedicalUseCases
// ---------------------------------------------------------------------------
describe("MedicalUseCases", () => {
  it("claimNextPatient delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", actor: "doctor1", stationId: "s1" };
    const result = await claimNextPatient(gw, cmd);
    expect(gw.claimNextPatient).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("callPatient delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", patientId: "p1", actor: "doctor1" };
    const result = await callPatient(gw, cmd);
    expect(gw.callPatient).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("completeAttention delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", patientId: "p1", actor: "doctor1", outcome: "recuperado" };
    const result = await completeAttention(gw, cmd);
    expect(gw.completeAttention).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("markAbsentAtMedical delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", patientId: "p1", actor: "doctor1" };
    const result = await markAbsentAtMedical(gw, cmd);
    expect(gw.markAbsentAtMedical).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("propaga el error del gateway", async () => {
    const gw = makeGateway();
    gw.claimNextPatient.mockRejectedValue(new Error("cola vacía"));
    await expect(claimNextPatient(gw, { queueId: "q1", actor: "doctor1" })).rejects.toThrow("cola vacía");
  });
});

// ---------------------------------------------------------------------------
// ConsultingRoomUseCases
// ---------------------------------------------------------------------------
describe("ConsultingRoomUseCases", () => {
  it("activateConsultingRoom delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", stationId: "c1", actor: "admin" };
    const result = await activateConsultingRoom(gw, cmd);
    expect(gw.activateConsultingRoom).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });

  it("deactivateConsultingRoom delega al gateway", async () => {
    const gw = makeGateway();
    const cmd = { queueId: "q1", stationId: "c1", actor: "admin" };
    const result = await deactivateConsultingRoom(gw, cmd);
    expect(gw.deactivateConsultingRoom).toHaveBeenCalledWith(cmd);
    expect(result).toEqual({ success: true });
  });
});

// ---------------------------------------------------------------------------
// CheckInPatientUseCase
// ---------------------------------------------------------------------------
describe("CheckInPatientUseCase", () => {
  it("construye el comando y llama al gateway", async () => {
    const gw = makeGateway();
    const result = await checkInPatient(gw, {
      queueId: "q1",
      patientId: "p1",
      patientName: "  Juan Pérez  ",
      priority: "High",
      consultationType: "General",
      actor: "recepcion1",
    });
    expect(gw.checkInPatient).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: "Juan Pérez",
        priority: "High",
        consultationType: "General",
        actor: "recepcion1",
        age: null,
        isPregnant: null,
        notes: null,
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it("pasa age, isPregnant y notes cuando se proveen", async () => {
    const gw = makeGateway();
    await checkInPatient(gw, {
      queueId: "q1",
      patientId: "p2",
      patientName: "Ana",
      priority: "Urgent",
      consultationType: "Pediatric",
      age: 5,
      isPregnant: false,
      notes: "alergia a penicilina",
      actor: "recepcion1",
    });
    expect(gw.checkInPatient).toHaveBeenCalledWith(
      expect.objectContaining({ age: 5, isPregnant: false, notes: "alergia a penicilina" }),
    );
  });

  it("propaga el error del gateway", async () => {
    const gw = makeGateway();
    gw.checkInPatient.mockRejectedValue(new Error("capacidad máxima"));
    await expect(
      checkInPatient(gw, { queueId: "q1", patientId: "p1", patientName: "Juan", priority: "Medium", consultationType: "General", actor: "rx" }),
    ).rejects.toThrow("capacidad máxima");
  });
});

// ---------------------------------------------------------------------------
// PatientState (dominio)
// ---------------------------------------------------------------------------
describe("PATIENT_STATE_LABELS", () => {
  it("contiene etiquetas para todos los estados", () => {
    const estados = [
      "WaitingAtReception",
      "WaitingAtCashier",
      "CalledAtCashier",
      "PaymentValidated",
      "PaymentPending",
      "WaitingAtConsulting",
      "CalledAtConsulting",
      "InConsultation",
      "AttentionCompleted",
      "AbsentAtCashier",
      "AbsentAtConsultation",
      "CancelledByPayment",
      "Cancelled",
    ] as const;
    for (const estado of estados) {
      expect(PATIENT_STATE_LABELS[estado]).toBeTruthy();
    }
  });
});

describe("isTerminalState", () => {
  it.each([
    "AttentionCompleted",
    "AbsentAtCashier",
    "AbsentAtConsultation",
    "CancelledByPayment",
    "Cancelled",
  ] as const)("retorna true para %s", (state) => {
    expect(isTerminalState(state)).toBe(true);
  });

  it.each([
    "WaitingAtReception",
    "WaitingAtCashier",
    "CalledAtCashier",
    "PaymentValidated",
    "PaymentPending",
    "WaitingAtConsulting",
    "CalledAtConsulting",
    "InConsultation",
  ] as const)("retorna false para %s", (state) => {
    expect(isTerminalState(state)).toBe(false);
  });
});
