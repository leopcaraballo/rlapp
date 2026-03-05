/**
 * Cobertura de HttpAppointmentRepository y rutas adicionales.
 */
import { render, screen } from "@testing-library/react";
import React from "react";

import TestPage from "@/app/test/page";

// ---------------------------------------------------------------------------
// TestPage
// ---------------------------------------------------------------------------
describe("TestPage", () => {
  it("renderiza el encabezado de prueba", () => {
    render(<TestPage />);
    expect(screen.getByRole("heading", { name: /test page/i })).toBeInTheDocument();
  });
});
