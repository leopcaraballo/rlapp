/**
 * Cobertura de HttpAppointmentRepository.
 */
import { HttpAppointmentRepository } from "@/repositories/HttpAppointmentRepository";

jest.mock("@/lib/httpClient", () => ({
  httpGet: jest.fn(),
  httpPost: jest.fn(),
}));

jest.mock("@/config/env", () => ({
  env: { API_BASE_URL: "http://api.test" },
}));

import { httpGet, httpPost } from "@/lib/httpClient";

const mockGet = httpGet as jest.Mock;
const mockPost = httpPost as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("HttpAppointmentRepository", () => {
  it("getAppointments llama a httpGet con la URL correcta", async () => {
    mockGet.mockResolvedValue([{ id: "1" }]);
    const repo = new HttpAppointmentRepository();
    const result = await repo.getAppointments();
    expect(mockGet).toHaveBeenCalledWith("http://api.test/appointments");
    expect(result).toEqual([{ id: "1" }]);
  });

  it("createAppointment llama a httpPost con la URL y el DTO", async () => {
    mockPost.mockResolvedValue({ id: "42" });
    const repo = new HttpAppointmentRepository();
    const dto = { fullName: "Juan", idCard: 12345, priority: "Medium" as const };
    const result = await repo.createAppointment(dto);
    expect(mockPost).toHaveBeenCalledWith("http://api.test/appointments", dto);
    expect(result).toEqual({ id: "42" });
  });

  it("propaga el error de httpGet", async () => {
    mockGet.mockRejectedValue(new Error("Error de red"));
    const repo = new HttpAppointmentRepository();
    await expect(repo.getAppointments()).rejects.toThrow("Error de red");
  });

  it("propaga el error de httpPost", async () => {
    mockPost.mockRejectedValue(new Error("Error al crear"));
    const repo = new HttpAppointmentRepository();
    await expect(repo.createAppointment({ fullName: "x", idCard: 1, priority: "Low" })).rejects.toThrow("Error al crear");
  });
});
