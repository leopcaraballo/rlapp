import "@testing-library/jest-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRouterReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => mockSearchParams,
}));

let mockSearchParams: { get: (key: string) => string | null } = {
  get: () => null,
};

const mockSignIn = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

jest.mock("@/config/env", () => ({
  env: { DEFAULT_QUEUE_ID: "QUEUE-01" },
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------
import LoginPage from "@/app/login/page";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("LoginPage", () => {
  beforeEach(() => {
    mockRouterReplace.mockReset();
    mockSignIn.mockReset();
    mockSearchParams = { get: () => null };
  });

  // ── Renderizado ────────────────────────────────────────────────────────────
  it("muestra el formulario de acceso con título y campos", () => {
    render(<LoginPage />);
    expect(screen.getByText("Acceso al sistema")).toBeInTheDocument();
    expect(screen.getByLabelText("Rol")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Tiempo de sesion (minutos)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ingresar" }),
    ).toBeInTheDocument();
  });

  it("muestra todas las opciones de rol", () => {
    render(<LoginPage />);
    const select = screen.getByLabelText("Rol");
    const opts = Array.from((select as HTMLSelectElement).options).map(
      (o) => o.value,
    );
    expect(opts).toEqual(
      expect.arrayContaining([
        "patient",
        "reception",
        "cashier",
        "doctor",
        "admin",
      ]),
    );
  });

  // ── Envío básico ──────────────────────────────────────────────────────────
  it("llama signIn y redirige a la ruta por defecto al enviar con rol patient", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("patient", 120));
    expect(mockRouterReplace).toHaveBeenCalledWith("/patient" === "/patient" ? "/display/QUEUE-01" : "/display/QUEUE-01");
  });

  it("muestra error si la identificación tiene menos de 6 caracteres", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "12345");

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText(/al menos 6 dígitos/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("redirige a /cashier cuando el rol es cashier", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    await user.selectOptions(screen.getByLabelText("Rol"), "cashier");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("cashier", 120));
    expect(mockRouterReplace).toHaveBeenCalledWith("/cashier");
  });

  it("redirige a /reception cuando el rol es reception", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    await user.selectOptions(screen.getByLabelText("Rol"), "reception");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith("reception", 120),
    );
    expect(mockRouterReplace).toHaveBeenCalledWith("/reception");
  });

  it("redirige a /medical cuando el rol es doctor", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    await user.selectOptions(screen.getByLabelText("Rol"), "doctor");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("doctor", 120));
    expect(mockRouterReplace).toHaveBeenCalledWith("/medical");
  });

  it("redirige a /consulting-rooms cuando el rol es admin", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    await user.selectOptions(screen.getByLabelText("Rol"), "admin");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("admin", 120));
    expect(mockRouterReplace).toHaveBeenCalledWith("/consulting-rooms");
  });

  // ── Parámetro next ─────────────────────────────────────────────────────────
  it("usa el parámetro ?next para la redirección si está presente", async () => {
    mockSearchParams = {
      get: (key: string) =>
        key === "next" ? encodeURIComponent("/dashboard") : null,
    };

    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    await user.selectOptions(screen.getByLabelText("Rol"), "admin");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalled());
    expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
  });

  // ── TTL de sesión ─────────────────────────────────────────────────────────
  it("pasa el TTL personalizado a signIn", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    const ttlInput = screen.getByLabelText("Tiempo de sesion (minutos)");
    await user.clear(ttlInput);
    await user.type(ttlInput, "60");

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("patient", 60));
  });

  it("usa TTL de 120 cuando el valor ingresado es inválido (0 o NaN)", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText("Número de Identificación");
    await user.type(idInput, "123456");

    const ttlInput = screen.getByLabelText("Tiempo de sesion (minutos)");
    await user.clear(ttlInput);
    await user.type(ttlInput, "0");

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("patient", 120));
  });
});
