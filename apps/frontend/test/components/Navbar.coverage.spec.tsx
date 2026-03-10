/**
 * Cobertura del componente Navbar.
 * Actualizado tras merge develop: Navbar ahora usa AuthContext y routeAccess.
 */
import "@testing-library/jest-dom";

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import Navbar from "@/components/Navbar/Navbar";
import type { UserRole } from "@/security/auth";

// ---------------------------------------------------------------------------
// Mock de next/navigation
// ---------------------------------------------------------------------------
const mockUsePathname = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ replace: mockRouterReplace }),
}));

// ---------------------------------------------------------------------------
// Mock de AuthContext
// ---------------------------------------------------------------------------
let mockRole: UserRole | null = "admin";
let mockIsAuthenticated = true;
const mockSignOut = jest.fn();

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    role: mockRole,
    isAuthenticated: mockIsAuthenticated,
    signOut: mockSignOut,
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Navbar", () => {
  beforeEach(() => {
    mockRole = "admin";
    mockIsAuthenticated = true;
    mockSignOut.mockReset();
    mockRouterReplace.mockReset();
  });

  // ── Rutas ocultas ─────────────────────────────────────────────────────────
  it("es null cuando la ruta es '/'", () => {
    mockUsePathname.mockReturnValue("/");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("es null cuando la ruta es '/login'", () => {
    mockUsePathname.mockReturnValue("/login");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("es null cuando la ruta comienza con '/display'", () => {
    mockUsePathname.mockReturnValue("/display/QUEUE-01");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  // ── Autenticación ─────────────────────────────────────────────────────────
  it("es null cuando no está autenticado", () => {
    mockIsAuthenticated = false;
    mockRole = null;
    mockUsePathname.mockReturnValue("/reception");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("es null cuando el rol es 'patient'", () => {
    mockRole = "patient";
    mockUsePathname.mockReturnValue("/reception");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  // ── Renderizado con auth válida ────────────────────────────────────────────
  it("renderiza el nav para un admin en /reception", () => {
    mockRole = "admin";
    mockIsAuthenticated = true;
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("muestra los vínculos permitidos para doctor (medical/waiting-room/dashboard)", () => {
    mockRole = "doctor";
    mockUsePathname.mockReturnValue("/medical");
    render(<Navbar />);
    expect(screen.getByText("Médico")).toBeInTheDocument();
    expect(screen.getByText("Sala de espera")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // Rutas no permitidas para doctor no deben aparecer
    expect(screen.queryByText("Caja")).not.toBeInTheDocument();
    expect(screen.queryByText("Recepción")).not.toBeInTheDocument();
  });

  it("admin ve todos los vínculos de navegación", () => {
    mockRole = "admin";
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    expect(screen.getByText("Recepción")).toBeInTheDocument();
    expect(screen.getByText("Caja")).toBeInTheDocument();
    expect(screen.getByText("Médico")).toBeInTheDocument();
    expect(screen.getByText("Consultorios")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("muestra solo caja y sala para cashier", () => {
    mockRole = "cashier";
    mockUsePathname.mockReturnValue("/cashier");
    render(<Navbar />);
    expect(screen.getByText("Caja")).toBeInTheDocument();
    expect(screen.getByText("Sala de espera")).toBeInTheDocument();
    expect(screen.queryByText("Médico")).not.toBeInTheDocument();
    expect(screen.queryByText("Recepción")).not.toBeInTheDocument();
  });

  // ── Clase activa ──────────────────────────────────────────────────────────
  it("aplica la clase activa al vínculo cuya ruta comienza con el pathname", () => {
    mockRole = "admin";
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    const activeLink = screen.getByText("Recepción");
    expect(activeLink.className).toContain("navLinkActive");
  });

  it("no aplica clase activa a rutas que no coinciden", () => {
    mockRole = "admin";
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    const inactiveLink = screen.getByText("Caja");
    expect(inactiveLink.className).not.toContain("navLinkActive");
  });

  it("aplica clase activa en /dashboard", () => {
    mockRole = "admin";
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Navbar />);
    const activeLink = screen.getByText("Dashboard");
    expect(activeLink.className).toContain("navLinkActive");
  });

  // ── Brand link ────────────────────────────────────────────────────────────
  it("renderiza el brand con enlace a /", () => {
    mockRole = "admin";
    mockUsePathname.mockReturnValue("/cashier");
    render(<Navbar />);
    const brand = screen.getByText("Turnos Disponibles");
    expect(brand.closest("a")).toHaveAttribute("href", "/");
  });

  // ── Cerrar sesión ─────────────────────────────────────────────────────────
  it("muestra el botón Cerrar sesion", () => {
    mockRole = "admin";
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    expect(
      screen.getByRole("button", { name: "Cerrar sesion" }),
    ).toBeInTheDocument();
  });

  it("al hacer clic en Cerrar sesion llama signOut y navega a /login", () => {
    mockRole = "admin";
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesion" }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith("/login");
  });
});

