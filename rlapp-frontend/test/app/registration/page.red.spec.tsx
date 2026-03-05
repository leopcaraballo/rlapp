import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── mock useAppointmentRegistration ─────────────────────────────────────────
let mockRegister: jest.Mock;
let mockLoading = false;
let mockSuccess: string | null = null;
let mockError: string | null = null;

jest.mock("@/hooks/useAppointmentRegistration", () => ({
  useAppointmentRegistration: () => ({
    register: mockRegister,
    loading: mockLoading,
    success: mockSuccess,
    error: mockError,
    isSubmitting: mockLoading,
  }),
}));

import RegistrationPage from "@/app/registration/page";

// ── helper ────────────────────────────────────────────────────────────────────
function renderRegistration() {
  return render(<RegistrationPage />);
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("RegistrationPage — RED", () => {
  beforeEach(() => {
    mockRegister = jest.fn();
    mockLoading  = false;
    mockSuccess  = null;
    mockError    = null;
  });

  // ── 1. Título ─────────────────────────────────────────────────────────────
  it("renderiza el título 'Registrar Turno'", () => {
    renderRegistration();
    expect(screen.getByRole("heading", { name: /Registrar Turno/i })).toBeInTheDocument();
  });

  // ── 2. Botón inicial ──────────────────────────────────────────────────────
  it("muestra el botón 'Registrar Ahora' cuando no está cargando", () => {
    renderRegistration();
    expect(screen.getByRole("button", { name: "Registrar Ahora" })).toBeInTheDocument();
  });

  // ── 3. Validación: nombre vacío ───────────────────────────────────────────
  it("muestra error de validación si el nombre está vacío al enviar", async () => {
    const user = userEvent.setup();
    renderRegistration();
    await user.click(screen.getByRole("button", { name: "Registrar Ahora" }));
    expect(await screen.findByText("El nombre completo es obligatorio.")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 4. Validación: idCard con menos de 6 dígitos ─────────────────────────
  it("muestra error de validación si idCard tiene menos de 6 dígitos", async () => {
    const user = userEvent.setup();
    renderRegistration();
    await user.type(screen.getByPlaceholderText("Nombre Completo"), "Juan Pérez");
    await user.type(screen.getByPlaceholderText(/Número de Identificación/i), "123");
    await user.click(screen.getByRole("button", { name: "Registrar Ahora" }));
    expect(
      await screen.findByText(/debe tener entre 6 y 12 dígitos/i),
    ).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 5. Submit válido: llama a register con los datos correctos ─────────────
  it("llama a register con fullName, idCard numérico y prioridad al enviar datos válidos", async () => {
    const user = userEvent.setup();
    renderRegistration();
    await user.type(screen.getByPlaceholderText("Nombre Completo"), "Ana Torres");
    await user.type(screen.getByPlaceholderText(/Número de Identificación/i), "123456");
    await user.click(screen.getByRole("button", { name: "Registrar Ahora" }));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        fullName: "Ana Torres",
        idCard: 123456,
        priority: "Medium",
      }),
    );
  });

  // ── 6. Submit con prioridad seleccionada ──────────────────────────────────
  it("envía la prioridad seleccionada por el usuario", async () => {
    const user = userEvent.setup();
    renderRegistration();
    await user.type(screen.getByPlaceholderText("Nombre Completo"), "Carlos Ríos");
    await user.type(screen.getByPlaceholderText(/Número de Identificación/i), "654321");
    await user.selectOptions(screen.getByRole("combobox"), "Urgent");
    await user.click(screen.getByRole("button", { name: "Registrar Ahora" }));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "Urgent" }),
      ),
    );
  });

  // ── 7. loading=true → botón muestra "Enviando..." ─────────────────────────
  it("muestra 'Enviando...' en el botón cuando loading es true", () => {
    mockLoading = true;
    renderRegistration();
    expect(screen.getByRole("button", { name: "Enviando..." })).toBeInTheDocument();
  });

  // ── 8. loading=true → inputs y botón deshabilitados ─────────────────────
  it("deshabilita los inputs y el botón cuando loading es true", () => {
    mockLoading = true;
    renderRegistration();
    expect(screen.getByPlaceholderText("Nombre Completo")).toBeDisabled();
    expect(screen.getByPlaceholderText(/Número de Identificación/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
  });

  // ── 9. success → mensaje visible ─────────────────────────────────────────
  it("muestra el mensaje de éxito cuando success no es null", () => {
    mockSuccess = "Turno registrado con éxito";
    renderRegistration();
    expect(screen.getByText("Turno registrado con éxito")).toBeInTheDocument();
  });

  // ── 10. error de API → mensaje visible ───────────────────────────────────
  it("muestra el mensaje de error del hook cuando error no es null", () => {
    mockError = "Error al registrar el turno";
    renderRegistration();
    expect(screen.getByText("Error al registrar el turno")).toBeInTheDocument();
  });

  // ── 11. Select: cuatro opciones de prioridad ──────────────────────────────
  it.each([
    { value: "Low",    label: "Prioridad Baja" },
    { value: "Medium", label: "Prioridad Media" },
    { value: "High",   label: "Prioridad Alta" },
    { value: "Urgent", label: "Prioridad Urgente" },
  ])("muestra la opción '$label' en el select de prioridad", ({ label }) => {
    renderRegistration();
    expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
  });
});
