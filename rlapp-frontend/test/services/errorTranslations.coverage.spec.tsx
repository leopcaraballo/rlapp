/**
 * Cobertura de errorTranslations y Alert component.
 */
import { render, screen } from "@testing-library/react";
import React from "react";

import Alert from "@/components/Alert";
import { translateApiError } from "@/services/api/errorTranslations";

// ===========================================================================
// translateApiError
// ===========================================================================
describe("translateApiError", () => {
  it("traduce mensaje exacto de dominio", () => {
    expect(translateApiError({ message: "Queue is at maximum capacity" })).toContain("capacidad máxima");
  });

  it("traduce mensaje parcial (includes)", () => {
    expect(translateApiError({ message: "Patient X is already in the queue" })).toContain("ya está registrado");
  });

  it("traduce 'no patients available' correctamente", () => {
    expect(translateApiError({ message: "No patients available in queue" })).toContain("No hay pacientes");
  });

  it("traduce 'not found in queue'", () => {
    expect(translateApiError({ message: "Patient P1 not found in queue" })).toContain("No se encontró");
  });

  it("traduce cuando hay paciente en atención activa", () => {
    expect(translateApiError({ message: "There is already a patient in active attention" })).toContain("atención activa");
  });

  it("traduce attempt exceeded para pagos", () => {
    expect(translateApiError({ message: "Payment attempts exceeded maximum of 3" })).toContain("máximo de intentos de pago");
  });

  it("traduce ConcurrencyConflict por código de error", () => {
    const result = translateApiError({ error: "ConcurrencyConflict", message: "" });
    expect(result).toContain("simultánea");
  });

  it("traduce DomainViolation por código de error", () => {
    const result = translateApiError({ error: "DomainViolation", message: "" });
    expect(result).toContain("no es válida");
  });

  it("traduce AggregateNotFound por código de error", () => {
    const result = translateApiError({ error: "AggregateNotFound", message: "" });
    expect(result).toContain("No se encontró la cola");
  });

  it("traduce InternalServerError por código de error", () => {
    const result = translateApiError({ error: "InternalServerError", message: "" });
    expect(result).toContain("error inesperado");
  });

  it("devuelve el mensaje original como fallback cuando no hay traducción", () => {
    expect(translateApiError({ message: "Custom unknown error", error: "Unknown" })).toBe("Custom unknown error");
  });

  it("devuelve el código de error si message está vacío y no hay traducción", () => {
    expect(translateApiError({ message: "", error: "SomeUnknownCode" })).toBe("SomeUnknownCode");
  });

  it("devuelve 'Error desconocido.' cuando ambos están vacíos", () => {
    expect(translateApiError({})).toBe("Error desconocido.");
  });

  it("traduce 'not found in event store'", () => {
    expect(translateApiError({ message: "Queue q1 not found in event store" })).toContain("No se encontró la cola");
  });

  it("traduce salas de consulta is already active", () => {
    expect(translateApiError({ message: "Room is already active" })).toContain("ya está activa");
  });

  it("traduce salas de consulta is already inactive", () => {
    expect(translateApiError({ message: "Room is already inactive" })).toContain("ya está inactiva");
  });
});

// ===========================================================================
// Alert component
// ===========================================================================
describe("Alert", () => {
  it("no renderiza nada si message es null", () => {
    const { container } = render(<Alert message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza el mensaje con rol alert", () => {
    render(<Alert message="Error de prueba" variant="error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Error de prueba")).toBeInTheDocument();
  });

  it("usa variant=info por defecto", () => {
    render(<Alert message="Mensaje informativo" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renderiza con variant=success", () => {
    render(<Alert message="Operación exitosa" variant="success" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
