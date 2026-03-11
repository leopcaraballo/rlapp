/**
 * Cobertura de HttpAppointmentRepository.
 */
import { HttpAppointmentRepository } from "@/repositories/HttpAppointmentRepository";

jest.mock("@/lib/httpClient", () => ({
  httpGet: jest.fn(),
  httpPost: jest.fn(),
}));

jest.mock("@/config/env", () => ({
  env: { API_BASE_URL: "http://api.test", DEFAULT_QUEUE_ID: "QUEUE-01" },
}));

import { httpGet, httpPost } from "@/lib/httpClient";

const mockGet = httpGet as jest.Mock;
const mockPost = httpPost as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("HttpAppointmentRepository", () => {
  it("getAppointments llama a httpGet con la URL de queue-state", async () => {
    mockGet.mockResolvedValue({
      patientsInQueue: [
        {
          patientId: "P-001",
          patientName: "Juan",
          priority: "Medium",
          checkInTime: "2026-01-01T10:00:00Z",
          waitTimeMinutes: 2,
        },
      ],
    });
    const repo = new HttpAppointmentRepository();
    const result = await repo.getAppointments();
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/waiting-room/QUEUE-01/queue-state"),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "P-001",
        fullName: "Juan",
        status: "waiting",
      }),
    ]);
  });

  it("createAppointment llama a httpPost con /api/reception/register y DTO mapeado", async () => {
    mockPost.mockResolvedValue({
      success: true,
      message: "OK",
      patientId: "12345",
    });
    const repo = new HttpAppointmentRepository();
    const dto = {
      fullName: "Juan",
      idCard: 12345,
      priority: "Medium" as const,
    };
    const result = await repo.createAppointment(dto);
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining("/api/reception/register"),
      expect.objectContaining({
        patientId: "12345",
        patientName: "Juan",
        priority: "Medium",
        consultationType: "General",
        actor: "reception",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: "12345", status: "accepted" }),
    );
  });

  it("propaga el error de httpGet", async () => {
    mockGet.mockRejectedValue(new Error("Error de red"));
    const repo = new HttpAppointmentRepository();
    await expect(repo.getAppointments()).rejects.toThrow("Error de red");
  });

  it("propaga el error de httpPost", async () => {
    mockPost.mockRejectedValue(new Error("Error al crear"));
    const repo = new HttpAppointmentRepository();
    await expect(
      repo.createAppointment({ fullName: "x", idCard: 1, priority: "Low" }),
    ).rejects.toThrow("Error al crear");
  });
});
