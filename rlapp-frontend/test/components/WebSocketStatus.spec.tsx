/**
 * 🧪 Tests for WebSocketStatus component
 *
 * Tests the real-time connection status indicator badge
 */

import { render, screen } from "@testing-library/react";

import WebSocketStatus from "@/components/WebSocketStatus";

describe("WebSocketStatus", () => {
  describe("Connected Status", () => {
    it("should render green indicator with 'Conectado' text when status=connected", () => {
      render(<WebSocketStatus status="connected" />);

      const badge = screen.getByTestId("websocket-status-connected");
      const label = screen.getByText("Conectado");

      expect(badge).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(badge).toHaveAttribute("role", "status");
      expect(badge).toHaveAttribute("aria-live", "polite");
    });

    it("should render green circle emoji for connected status", () => {
      render(<WebSocketStatus status="connected" />);

      const badge = screen.getByTestId("websocket-status-connected");
      expect(badge.textContent).toContain("🟢");
    });
  });

  describe("Connecting Status", () => {
    it("should render yellow indicator with 'Conectando...' text when status=connecting", () => {
      render(<WebSocketStatus status="connecting" />);

      const badge = screen.getByTestId("websocket-status-connecting");
      const label = screen.getByText("Conectando...");

      expect(badge).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });

    it("should render yellow circle emoji for connecting status", () => {
      render(<WebSocketStatus status="connecting" />);

      const badge = screen.getByTestId("websocket-status-connecting");
      expect(badge.textContent).toContain("🟡");
    });
  });

  describe("Disconnected Status", () => {
    it("should render red indicator with 'Desconectado' text when status=disconnected", () => {
      render(<WebSocketStatus status="disconnected" />);

      const badge = screen.getByTestId("websocket-status-disconnected");
      const label = screen.getByText("Desconectado");

      expect(badge).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });

    it("should render red circle emoji for disconnected status", () => {
      render(<WebSocketStatus status="disconnected" />);

      const badge = screen.getByTestId("websocket-status-disconnected");
      expect(badge.textContent).toContain("🔴");
    });
  });

  describe("Variants", () => {
    it("should apply inline variant by default", () => {
      const { container } = render(
        <WebSocketStatus status="connected" variant="inline" />,
      );

      const badge = container.querySelector('[class*="inlineVariant"]');
      expect(badge).toBeTruthy();
    });

    it("should apply block variant when specified", () => {
      const { container } = render(
        <WebSocketStatus status="connected" variant="block" />,
      );

      const badge = container.querySelector('[class*="blockVariant"]');
      expect(badge).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should have role='status' for screen readers", () => {
      render(<WebSocketStatus status="connected" />);

      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
    });

    it("should have aria-live='polite' for dynamic updates", () => {
      render(<WebSocketStatus status="connected" />);

      const badge = screen.getByTestId("websocket-status-connected");
      expect(badge).toHaveAttribute("aria-live", "polite");
    });

    it("should update aria-live content when status changes", () => {
      const { rerender } = render(<WebSocketStatus status="connected" />);

      let badge = screen.getByRole("status");
      expect(badge).toHaveTextContent("Conectado");

      rerender(<WebSocketStatus status="disconnected" />);

      badge = screen.getByRole("status");
      expect(badge).toHaveTextContent("Desconectado");
    });
  });

  describe("Data Attributes", () => {
    it("should have data-testid for connected status", () => {
      render(<WebSocketStatus status="connected" />);

      const badge = screen.getByTestId("websocket-status-connected");
      expect(badge).toHaveAttribute(
        "data-testid",
        "websocket-status-connected",
      );
    });

    it("should have data-testid for connecting status", () => {
      render(<WebSocketStatus status="connecting" />);

      const badge = screen.getByTestId("websocket-status-connecting");
      expect(badge).toHaveAttribute(
        "data-testid",
        "websocket-status-connecting",
      );
    });

    it("should have data-testid for disconnected status", () => {
      render(<WebSocketStatus status="disconnected" />);

      const badge = screen.getByTestId("websocket-status-disconnected");
      expect(badge).toHaveAttribute(
        "data-testid",
        "websocket-status-disconnected",
      );
    });
  });
});
