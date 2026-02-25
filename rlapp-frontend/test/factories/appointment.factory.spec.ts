import { AppointmentFactory } from "@/test/factories/appointment.factory";

describe("AppointmentFactory", () => {
  const originalRandom = Math.random;

  beforeEach(() => {
    Math.random = () => 0.123456789; // deterministic id suffix
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("creates a default appointment with generated id", () => {
    const appointment = AppointmentFactory.create();

    expect(appointment.id).toMatch(/^apt-/);
    expect(appointment.status).toBe("waiting");
    expect(appointment.priority).toBe("medium");
    expect(appointment.office).toBeNull();
  });

  it("creates specialized variants honoring overrides", () => {
    const waiting = AppointmentFactory.createWaiting({ priority: "High" });
    const called = AppointmentFactory.createCalled({ office: "9" });
    const completed = AppointmentFactory.createCompleted({ priority: "Low" });

    expect(waiting.status).toBe("waiting");
    expect(waiting.priority).toBe("high");

    expect(called.status).toBe("called");
    expect(called.office).toBe("9");

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).not.toBeNull();
    expect(completed.timestamp).toBeLessThan(completed.completedAt as number);
  });

  it("creates many appointments reusing overrides", () => {
    const list = AppointmentFactory.createMany(3, { priority: "High" });

    expect(list).toHaveLength(3);
    list.forEach((item) => {
      expect(item.priority).toBe("high");
      expect(item.id).toMatch(/^apt-/);
    });
  });
});
