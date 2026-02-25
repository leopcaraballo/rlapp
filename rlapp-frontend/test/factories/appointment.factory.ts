import { Appointment } from "@/domain/Appointment";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MockAppointment extends Appointment {}

export class AppointmentFactory {
  static create(overrides: Partial<Appointment> = {}): Appointment {
    const timestamp = Date.now();
    return {
      id: `apt-${Math.random().toString(36).substr(2, 9)}`,
      idCard: 12345678,
      fullName: "Test Patient",
      priority: "medium",
      status: "waiting",
      office: null,
      timestamp,
      completedAt: undefined,
      ...overrides,
    };
  }

  static createWaiting(overrides: Partial<Appointment> = {}): Appointment {
    return this.create({
      status: "waiting",
      office: null,
      ...overrides,
    });
  }

  static createCalled(overrides: Partial<Appointment> = {}): Appointment {
    return this.create({
      status: "called",
      office: "1",
      ...overrides,
    });
  }

  static createCompleted(overrides: Partial<Appointment> = {}): Appointment {
    const timestamp = Date.now() - 3600000; // 1h ago
    return this.create({
      status: "completed",
      office: "1",
      timestamp,
      completedAt: Date.now(),
      ...overrides,
    });
  }

  static createMany(
    count: number,
    overrides: Partial<Appointment> = {},
  ): Appointment[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
