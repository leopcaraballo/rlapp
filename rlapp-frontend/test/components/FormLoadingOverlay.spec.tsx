/**
 * 🧪 Tests for FormLoadingOverlay component
 *
 * Tests the form submission loading overlay
 */

import { render, screen } from "@testing-library/react";

import FormLoadingOverlay from "@/components/FormLoadingOverlay";

describe("FormLoadingOverlay", () => {
  describe("Visibility", () => {
    it("should return null when isLoading=false", () => {
      const { container } = render(<FormLoadingOverlay isLoading={false} />);

      const overlay = container.querySelector('[class*="overlay"]');
      expect(overlay).not.toBeInTheDocument();
    });

    it("should render overlay when isLoading=true", () => {
      render(<FormLoadingOverlay isLoading={true} />);

      const overlay = screen.getByTestId("form-loading-overlay");
      expect(overlay).toBeInTheDocument();
    });

    it("should toggle visibility based on isLoading prop", () => {
      const { rerender, container } = render(
        <FormLoadingOverlay isLoading={false} />,
      );

      let overlay = container.querySelector('[class*="overlay"]');
      expect(overlay).not.toBeInTheDocument();

      rerender(<FormLoadingOverlay isLoading={true} />);

      overlay = screen.getByTestId("form-loading-overlay");
      expect(overlay).toBeInTheDocument();

      rerender(<FormLoadingOverlay isLoading={false} />);

      overlay = container.querySelector('[class*="overlay"]');
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe("Default State", () => {
    it("should display default message 'Cargando...' when no message prop", () => {
      render(<FormLoadingOverlay isLoading={true} />);

      const message = screen.getByText("Cargando...");
      expect(message).toBeInTheDocument();
    });

    it("should render spinner element", () => {
      const { container } = render(<FormLoadingOverlay isLoading={true} />);

      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });

    it("should have overlay container", () => {
      const { container } = render(<FormLoadingOverlay isLoading={true} />);

      const overlay = container.querySelector('[class*="overlay"]');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe("Custom Message", () => {
    it("should display custom message when provided", () => {
      render(
        <FormLoadingOverlay isLoading={true} message="Registrando turno..." />,
      );

      const message = screen.getByText("Registrando turno...");
      expect(message).toBeInTheDocument();

      // Should not show default message
      const defaultMessage = screen.queryByText("Cargando...");
      expect(defaultMessage).not.toBeInTheDocument();
    });

    it("should update message when prop changes", () => {
      const { rerender } = render(
        <FormLoadingOverlay isLoading={true} message="Mensaje Original" />,
      );

      expect(screen.getByText("Mensaje Original")).toBeInTheDocument();

      rerender(
        <FormLoadingOverlay isLoading={true} message="Mensaje Actualizado" />,
      );

      expect(screen.getByText("Mensaje Actualizado")).toBeInTheDocument();
      expect(screen.queryByText("Mensaje Original")).not.toBeInTheDocument();
    });

    it("should handle empty string message", () => {
      render(<FormLoadingOverlay isLoading={true} message="" />);

      const overlay = screen.getByTestId("form-loading-overlay");
      expect(overlay).toBeInTheDocument();

      // Empty message should not be visible but element exists
      const messageElement = overlay.querySelector('[class*="message"]');
      expect(messageElement?.textContent).toBe("");
    });

    it("should handle long message text", () => {
      const longMessage =
        "Este es un mensaje muy largo de carga que describe detalladamente lo que está pasando en el servidor";

      render(<FormLoadingOverlay isLoading={true} message={longMessage} />);

      const message = screen.getByText(longMessage);
      expect(message).toBeInTheDocument();
    });
  });

  describe("Structure", () => {
    it("should have test ID for identification", () => {
      render(<FormLoadingOverlay isLoading={true} />);

      const overlay = screen.getByTestId("form-loading-overlay");
      expect(overlay).toHaveAttribute("data-testid", "form-loading-overlay");
    });

    it("should have container div inside overlay", () => {
      const { container } = render(<FormLoadingOverlay isLoading={true} />);

      const overlay = container.querySelector('[class*="overlay"]');
      const containerDiv = overlay?.querySelector('[class*="container"]');

      expect(containerDiv).toBeInTheDocument();
    });

    it("should render spinner inside container", () => {
      const { container } = render(<FormLoadingOverlay isLoading={true} />);

      const containerDiv = container.querySelector('[class*="container"]');
      const spinner = containerDiv?.querySelector('[class*="spinner"]');

      expect(spinner).toBeInTheDocument();
    });

    it("should render message inside container", () => {
      const { container } = render(
        <FormLoadingOverlay isLoading={true} message="Test Message" />,
      );

      const containerDiv = container.querySelector('[class*="container"]');
      const message = containerDiv?.querySelector('[class*="message"]');

      expect(message).toBeInTheDocument();
      expect(message?.textContent).toBe("Test Message");
    });
  });

  describe("Accessibility", () => {
    it("should be hidden from screen readers when not visible", () => {
      const { container } = render(<FormLoadingOverlay isLoading={false} />);

      // When isLoading=false, component returns null
      // So nothing should be present
      const overlay = container.querySelector(
        '[data-testid="form-loading-overlay"]',
      );
      expect(overlay).not.toBeInTheDocument();
    });

    it("should be accessible when visible", () => {
       
      render(<FormLoadingOverlay isLoading={true} message="Procesando..." />);

      const overlay = screen.getByTestId("form-loading-overlay");
      expect(overlay).toBeVisible();
    });
  });

  describe("Styling", () => {
    it("should apply overlay CSS class", () => {
      const { container } = render(<FormLoadingOverlay isLoading={true} />);

      const overlay = container.querySelector('[class*="overlay"]');
      expect(overlay?.className).toMatch(/overlay/);
    });

    it("should apply container CSS class", () => {
      const { container } = render(<FormLoadingOverlay isLoading={true} />);

      const containerDiv = container.querySelector('[class*="container"]');
      expect(containerDiv?.className).toMatch(/container/);
    });

    it("should apply spinner CSS class", () => {
      const { container } = render(<FormLoadingOverlay isLoading={true} />);

      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner?.className).toMatch(/spinner/);
    });

    it("should apply message CSS class", () => {
      const { container } = render(
        <FormLoadingOverlay isLoading={true} message="Test" />,
      );

      const message = container.querySelector('[class*="message"]');
      expect(message?.className).toMatch(/message/);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid isLoading toggles", () => {
      const { rerender } = render(<FormLoadingOverlay isLoading={true} />);

      expect(screen.getByTestId("form-loading-overlay")).toBeInTheDocument();

      rerender(<FormLoadingOverlay isLoading={false} />);
      expect(
        screen.queryByTestId("form-loading-overlay"),
      ).not.toBeInTheDocument();

      rerender(<FormLoadingOverlay isLoading={true} />);
      expect(screen.getByTestId("form-loading-overlay")).toBeInTheDocument();
    });

    it("should handle undefined message gracefully", () => {
      render(<FormLoadingOverlay isLoading={true} message={undefined} />);

      // Should fall back to default message
      expect(screen.getByText("Cargando...")).toBeInTheDocument();
    });

    it("should handle special characters in message", () => {
      const specialMessage = "¡Cargando... (50%) < ½ @ #€";

      render(<FormLoadingOverlay isLoading={true} message={specialMessage} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });
});
