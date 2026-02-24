/**
 * 🧪 Tests for CompletedAppointmentCard component
 *
 * Tests the specialized card for completed appointments
 */

import { render, screen } from "@testing-library/react";

import { CompletedAppointmentCard } from "@/components/AppointmentCard/CompletedAppointmentCard";
import { Appointment } from "@/domain/Appointment";

describe("CompletedAppointmentCard", () => {
  const startTime = 1707907200000;
  const endTime = startTime + 5 * 60 * 1000; // 5 minutes later

  const mockAppointment: Appointment = {
    id: "apt-completed-001",
    fullName: "Alice Johnson",
    status: "completed",
    office: "2",
    priority: "low",
    timestamp: startTime,
    completedAt: endTime,
    idCard: 0,
  };

  describe("Rendering", () => {
    it("should render patient name", () => {
      render(<CompletedAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });

    it("should display office number", () => {
      render(<CompletedAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should display N/A when office is null", () => {
      const noOffice: Appointment = {
        ...mockAppointment,
        office: null,
      };

      render(<CompletedAppointmentCard appointment={noOffice} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("should display priority badge", () => {
      render(<CompletedAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("🟢 Baja")).toBeInTheDocument();
    });
  });

  describe("Duration Calculation", () => {
    it("should calculate and display duration in minutes and seconds", () => {
      render(<CompletedAppointmentCard appointment={mockAppointment} />);

      // 5 minutes = "5m 0s"
      expect(screen.getByText("5m 0s")).toBeInTheDocument();
    });

    it("should display duration in seconds when less than 60 seconds", () => {
      const shortDuration: Appointment = {
        ...mockAppointment,
        completedAt: mockAppointment.timestamp + 45 * 1000, // 45 seconds
      };

      render(<CompletedAppointmentCard appointment={shortDuration} />);

      expect(screen.getByText("45s")).toBeInTheDocument();
    });

    it("should display N/A when completedAt is missing", () => {
      const noCompletedAt: Appointment = {
        ...mockAppointment,
        completedAt: undefined,
      };

      render(<CompletedAppointmentCard appointment={noCompletedAt} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("should calculate duration correctly for 1 minute 30 seconds", () => {
      const duration90sec: Appointment = {
        ...mockAppointment,
        completedAt: mockAppointment.timestamp + 90 * 1000,
      };

      render(<CompletedAppointmentCard appointment={duration90sec} />);

      expect(screen.getByText("1m 30s")).toBeInTheDocument();
    });

    it("should calculate duration correctly for multiple minutes", () => {
      const duration12min: Appointment = {
        ...mockAppointment,
        completedAt: mockAppointment.timestamp + 12.5 * 60 * 1000, // 12m 30s
      };

      render(<CompletedAppointmentCard appointment={duration12min} />);

      expect(screen.getByText("12m 30s")).toBeInTheDocument();
    });
  });

  describe("Priority Badges", () => {
    it("should show high priority badge", () => {
      const highPriority: Appointment = {
        ...mockAppointment,
        priority: "high",
      };

      render(<CompletedAppointmentCard appointment={highPriority} />);

      expect(screen.getByText("🔴 Alta")).toBeInTheDocument();
    });

    it("should show medium priority badge", () => {
      const mediumPriority: Appointment = {
        ...mockAppointment,
        priority: "medium",
      };

      render(<CompletedAppointmentCard appointment={mediumPriority} />);

      expect(screen.getByText("🟡 Media")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have completed status class", () => {
      const { container } = render(
        <CompletedAppointmentCard appointment={mockAppointment} />,
      );

      const li = container.querySelector("li");
      expect(li).toHaveClass("completed");
    });

    it("should have appointmentCard class", () => {
      const { container } = render(
        <CompletedAppointmentCard appointment={mockAppointment} />,
      );

      const li = container.querySelector("li");
      expect(li).toHaveClass("appointmentCard");
    });
  });

  describe("Props", () => {
    it("should accept optional timeIcon prop", () => {
      const { container } = render(
        <CompletedAppointmentCard appointment={mockAppointment} timeIcon="✓" />,
      );

      expect(container).toBeTruthy();
    });

    it("should render without timeIcon prop", () => {
      const { container } = render(
        <CompletedAppointmentCard appointment={mockAppointment} />,
      );

      expect(container).toBeTruthy();
    });
  });

  describe("Office Badge Rendering", () => {
    it("should handle different office numbers", () => {
      const differentOffice: Appointment = {
        ...mockAppointment,
        office: "5",
      };

      render(<CompletedAppointmentCard appointment={differentOffice} />);

      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });
});
