import { env } from "@/config/env";
import { httpGet, httpPost } from "@/lib/httpClient";
import { HttpAppointmentRepository } from "@/repositories/HttpAppointmentRepository";

jest.mock("@/lib/httpClient", () => ({
  httpGet: jest.fn(),
  httpPost: jest.fn(),
}));

describe("HttpAppointmentRepository", () => {
  let repository: HttpAppointmentRepository;

  beforeEach(() => {
    repository = new HttpAppointmentRepository();
    jest.clearAllMocks();
  });

  it("should fetch appointments from queue-state endpoint and map to Appointment[]", async () => {
    const mockQueueState = {
      patientsInQueue: [
        {
          patientId: "P-001",
          patientName: "Test",
          priority: "High",
          checkInTime: "2026-01-01T10:00:00Z",
          waitTimeMinutes: 5,
        },
      ],
    };
    (httpGet as jest.Mock).mockResolvedValue(mockQueueState);

    const result = await repository.getAppointments();

    expect(httpGet).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/waiting-room/"),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "P-001",
        fullName: "Test",
        status: "waiting",
        priority: "High",
      }),
    ]);
  });

  it("should create appointment via /api/reception/register and map response", async () => {
    const mockResponse = {
      success: true,
      message: "Paciente registrado",
      correlationId: "abc",
      eventCount: 1,
      patientId: "99",
    };
    (httpPost as jest.Mock).mockResolvedValue(mockResponse);

    const result = await repository.createAppointment({
      fullName: "New Patient",
      idCard: 99,
      priority: "High",
    });

    expect(httpPost).toHaveBeenCalledWith(
      expect.stringContaining("/api/reception/register"),
      expect.objectContaining({
        patientId: "99",
        patientName: "New Patient",
        priority: "High",
        consultationType: "General",
        actor: "reception",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: "99",
        status: "accepted",
      }),
    );
  });
});
