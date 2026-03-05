/**
 * 🧪 Tests for WaitingAppointmentCard component
 *
 * Tests the specialized card for appointments awaiting assignment
 */

import { render, screen } from "@testing-library/react";

import { WaitingAppointmentCard } from "@/components/AppointmentCard/WaitingAppointmentCard";
import { Appointment } from "@/domain/Appointment";

describe("WaitingAppointmentCard", () => {
  const mockAppointment: Appointment = {
    id: "apt-waiting-001",
    fullName: "John Doe",
    status: "waiting",
    office: null,
    priority: "High",
    timestamp: Date.now(),
    idCard: 0,
  };

  describe("Rendering", () => {
    it("should render patient name", () => {
      render(<WaitingAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should display 'Pendiente' for office status", () => {
      render(<WaitingAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("Pendiente")).toBeInTheDocument();
    });

    it("should display priority badge for high priority", () => {
      render(<WaitingAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("🔴 Alta")).toBeInTheDocument();
    });
  });

  describe("Priority Badges", () => {
    it("should show correct badge for medium priority", () => {
      const mediumPriority: Appointment = {
        ...mockAppointment,
        priority: "Medium",
      };

      render(<WaitingAppointmentCard appointment={mediumPriority} />);

      expect(screen.getByText("🟡 Media")).toBeInTheDocument();
    });

    it("should show correct badge for low priority", () => {
      const lowPriority: Appointment = {
        ...mockAppointment,
        priority: "Low",
      };

      render(<WaitingAppointmentCard appointment={lowPriority} />);

      expect(screen.getByText("🟢 Baja")).toBeInTheDocument();
    });
  });

  describe("Props", () => {
    it("should accept optional timeIcon prop", () => {
      const { container } = render(
        <WaitingAppointmentCard appointment={mockAppointment} timeIcon="📋" />,
      );

      // Component renders without errors
      expect(container).toBeTruthy();
    });
  });

  describe("Styling", () => {
    it("should have waiting status class", () => {
      const { container } = render(
        <WaitingAppointmentCard appointment={mockAppointment} />,
      );

      const li = container.querySelector("li");
      expect(li).toHaveClass("waiting");
    });

    it("should have appointmentCard class", () => {
      const { container } = render(
        <WaitingAppointmentCard appointment={mockAppointment} />,
      );

      const li = container.querySelector("li");
      expect(li).toHaveClass("appointmentCard");
    });
  });

  describe("Data Attributes", () => {
    it("should set data-status attribute for priority badge", () => {
      const { container } = render(
        <WaitingAppointmentCard appointment={mockAppointment} />,
      );

      const statusBadge = container.querySelector('[data-status="High"]');
      expect(statusBadge).toBeInTheDocument();
    });
  });
});
