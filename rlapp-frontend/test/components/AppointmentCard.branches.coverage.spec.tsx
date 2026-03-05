/**
 * Cobertura adicional de AppointmentCard — branches de prioridad, office y showTime.
 */
import { render, screen } from "@testing-library/react";
import React from "react";

import AppointmentCard from "@/components/AppointmentCard/AppointmentCard";
import type { Appointment } from "@/domain/Appointment";

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "1",
    fullName: "Juan Pérez",
    idCard: "CC-123",
    office: null,
    timestamp: Date.now(),
    status: "waiting",
    priority: "Medium",
    ...overrides,
  };
}

describe("AppointmentCard — branches de prioridad", () => {
  it.each([
    ["Urgent", "Urgente"],
    ["High", "Alta"],
    ["Medium", "Media"],
    ["Low", "Baja"],
  ] as const)("muestra badge '%s'", (priority, label) => {
    render(
      <AppointmentCard appointment={makeAppointment({ priority })} status="waiting" />,
    );
    expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
  });
});

describe("AppointmentCard — branch office", () => {
  it("muestra 'Pendiente' si office es null", () => {
    render(
      <AppointmentCard appointment={makeAppointment({ office: null })} status="waiting" />,
    );
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("muestra el office cuando está definido", () => {
    render(
      <AppointmentCard appointment={makeAppointment({ office: "C-1" })} status="called" />,
    );
    expect(screen.getByText("C-1")).toBeInTheDocument();
  });
});

describe("AppointmentCard — showTime y completedAt", () => {
  it("no muestra el footer de hora cuando showTime=false", () => {
    const { container } = render(
      <AppointmentCard appointment={makeAppointment()} status="waiting" showTime={false} />,
    );
    // El footer de hora no debe estar presente
    expect(container.querySelector("[class*='cardFooter']")).toBeNull();
  });

  it("muestra la hora con completedAt cuando showTime=true y completedAt está definido", () => {
    const ts = new Date("2026-03-02T10:30:00").getTime();
    render(
      <AppointmentCard
        appointment={makeAppointment({ completedAt: ts, timestamp: ts - 10000 })}
        status="completed"
        showTime
      />,
    );
    // Debe haber texto de hora en formato HH:MM:SS
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("muestra la hora con timestamp cuando showTime=true y completedAt es undefined", () => {
    const ts = new Date("2026-03-02T09:00:00").getTime();
    render(
      <AppointmentCard
        appointment={makeAppointment({ timestamp: ts })}
        status="waiting"
        showTime
        timeIcon="🕐"
      />,
    );
    expect(screen.getByText("🕐")).toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });
});
