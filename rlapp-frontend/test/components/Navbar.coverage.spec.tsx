/**
 * Cobertura del componente Navbar.
 */
import { render, screen } from "@testing-library/react";
import React from "react";

import Navbar from "@/components/Navbar/Navbar";

// ---------------------------------------------------------------------------
// Mock de next/navigation
// ---------------------------------------------------------------------------
const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Navbar", () => {
  it("es null cuando la ruta es '/'", () => {
    mockUsePathname.mockReturnValue("/");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza el nav cuando la ruta no está en HIDDEN_ROUTES", () => {
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("muestra todos los vínculos de navegación", () => {
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    expect(screen.getByText("Recepción")).toBeInTheDocument();
    expect(screen.getByText("Caja")).toBeInTheDocument();
    expect(screen.getByText("Médico")).toBeInTheDocument();
    expect(screen.getByText("Consultorios")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("aplica la clase activa al vínculo cuya ruta comienza con el pathname", () => {
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    const activeLink = screen.getByText("Recepción");
    expect(activeLink.className).toContain("navLinkActive");
  });

  it("no aplica clase activa a rutas que no coinciden", () => {
    mockUsePathname.mockReturnValue("/reception");
    render(<Navbar />);
    const inactiveLink = screen.getByText("Caja");
    expect(inactiveLink.className).not.toContain("navLinkActive");
  });

  it("renderiza también en /dashboard con el vínculo Dashboard activo", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Navbar />);
    const activeLink = screen.getByText("Dashboard");
    expect(activeLink.className).toContain("navLinkActive");
  });

  it("renderiza el brand con enlace a /", () => {
    mockUsePathname.mockReturnValue("/cashier");
    render(<Navbar />);
    const brand = screen.getByText("Turnos Disponibles");
    expect(brand.closest("a")).toHaveAttribute("href", "/");
  });
});
