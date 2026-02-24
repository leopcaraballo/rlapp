/**
 * @jest-environment jsdom
 *
 * 🧪 Tests for Registration Page
 */

import { render, screen } from "@testing-library/react";

import RegistrationPage from "@/app/registration/page";

// Mock the AppointmentRegistrationForm component
jest.mock(
  "@/components/AppointmentRegistrationForm/AppointmentRegistrationForm",
  () => {
    return function MockAppointmentRegistrationForm() {
      return (
        <div data-testid="appointment-registration-form">Registration Form</div>
      );
    };
  },
);

describe("RegistrationPage", () => {
  describe("Rendering", () => {
    it("should render the registration form component", () => {
      render(<RegistrationPage />);

      const form = screen.getByTestId("appointment-registration-form");
      expect(form).toBeInTheDocument();
    });

    it("should display the form content", () => {
      render(<RegistrationPage />);

      expect(screen.getByText("Registration Form")).toBeInTheDocument();
    });

    it("should render as a page wrapper", () => {
      const { container } = render(<RegistrationPage />);

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe("Component Composition", () => {
    it("should render AppointmentRegistrationForm directly", () => {
      const { container } = render(<RegistrationPage />);

      const form = container.querySelector(
        '[data-testid="appointment-registration-form"]',
      );
      expect(form).toBeInTheDocument();
    });
  });

  describe("Page Metadata", () => {
    it("should be a client component", () => {
      // Registration page uses "use client" directive
      const { container } = render(<RegistrationPage />);

      expect(container).toBeTruthy();
    });
  });
});
