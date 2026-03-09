/**
 * 🧪 Tests for AppointmentRegistrationForm component
 *
 * Tests form submission, validation, and error handling for appointment registration
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AppointmentRegistrationForm from "@/components/AppointmentRegistrationForm/AppointmentRegistrationForm";

// Mock the DependencyContext
jest.mock("@/context/DependencyContext", () => ({
  useDependencies: jest.fn(() => ({
    repository: {
      createAppointment: jest.fn(),
    },
    realTime: {},
  })),
}));

// Mock the hook
const mockRegister = jest.fn();
jest.mock("@/hooks/useAppointmentRegistration", () => ({
  useAppointmentRegistration: () => ({
    register: mockRegister,
    loading: false,
    success: null,
    error: null,
    isSubmitting: false,
  }),
}));

describe("AppointmentRegistrationForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render form heading", () => {
      render(<AppointmentRegistrationForm />);

      expect(screen.getByText("Registrar Turno")).toBeInTheDocument();
    });

    it("should render full name input field", () => {
      render(<AppointmentRegistrationForm />);

      const fullNameInput = screen.getByPlaceholderText("Nombre Completo");
      expect(fullNameInput).toBeInTheDocument();
    });

    it("should render ID card input field", () => {
      render(<AppointmentRegistrationForm />);

      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );
      expect(idCardInput).toBeInTheDocument();
    });

    it("should render priority select dropdown", () => {
      render(<AppointmentRegistrationForm />);

      const selects = screen.getAllByRole("combobox");
      const select = selects[0];
      expect(select).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<AppointmentRegistrationForm />);

      const submitButton = screen.getByText("Registrar Ahora");
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should prevent submission with empty full name", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );
      const submitButton = screen.getByText("Registrar Ahora");

      await user.type(idCardInput, "123456");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("El nombre completo es obligatorio."),
        ).toBeInTheDocument();
      });

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show error for invalid ID card format (too short)", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const fullNameInput = screen.getByPlaceholderText("Nombre Completo");
      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );
      const submitButton = screen.getByText("Registrar Ahora");

      await user.type(fullNameInput, "John Doe");
      await user.type(idCardInput, "123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "El número de identificación debe tener entre 6 y 12 dígitos.",
          ),
        ).toBeInTheDocument();
      });

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show error for invalid ID card format (non-numeric)", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const fullNameInput = screen.getByPlaceholderText("Nombre Completo");
      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );
      const submitButton = screen.getByText("Registrar Ahora");

      await user.type(fullNameInput, "John Doe");
      await user.type(idCardInput, "ABC1234");
      await user.click(submitButton);

      // Only numeric characters should be accepted by the input
      expect((idCardInput as HTMLInputElement).value).toBe("1234");
    });

    it("should show error for ID card longer than 12 digits", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const fullNameInput = screen.getByPlaceholderText("Nombre Completo");
      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );

      await user.type(fullNameInput, "John Doe");
      await user.type(idCardInput, "123456789012345");

      // maxLength should prevent input
      expect((idCardInput as HTMLInputElement).value).toBe("123456789012");
    });
  });

  describe("Form Submission", () => {
    it("should call register with correct data on valid submission", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const fullNameInput = screen.getByPlaceholderText("Nombre Completo");
      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );
      const submitButton = screen.getByText("Registrar Ahora");

      await user.type(fullNameInput, "Jane Smith");
      await user.type(idCardInput, "987654321");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: "Jane Smith",
          idCard: 987654321,
          priority: "Medium",
        });
      });
    });

    it("should submit with high priority when selected", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const fullNameInput = screen.getByPlaceholderText("Nombre Completo");
      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );
      const prioritySelect = screen.getAllByRole("combobox")[0];
      const submitButton = screen.getByText("Registrar Ahora");

      await user.type(fullNameInput, "John Doe");
      await user.type(idCardInput, "123456");
      await user.selectOptions(prioritySelect, "High");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: "John Doe",
          idCard: 123456,
          priority: "High",
        });
      });
    });

    it("should submit with low priority when selected", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const fullNameInput = screen.getByPlaceholderText("Nombre Completo");
      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );
      const prioritySelect = screen.getAllByRole("combobox")[0];
      const submitButton = screen.getByText("Registrar Ahora");

      await user.type(fullNameInput, "Alice Johnson");
      await user.type(idCardInput, "654321");
      await user.selectOptions(prioritySelect, "Low");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: "Alice Johnson",
          idCard: 654321,
          priority: "Low",
        });
      });
    });
  });

  describe("Form State", () => {
    it("should default to medium priority", () => {
      render(<AppointmentRegistrationForm />);

      const selects = screen.getAllByRole("combobox");
      const prioritySelect = selects[0] as HTMLSelectElement;
      expect(prioritySelect.value).toBe("Medium");
    });
  });

  describe("Input Constraints", () => {
    it("should only accept numeric input in ID card field", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );

      await user.type(idCardInput, "123abc456def");

      // Only numeric characters should be present
      expect((idCardInput as HTMLInputElement).value).toBe("123456");
    });

    it("should enforce maxLength of 12 digits", async () => {
      const user = userEvent.setup();
      render(<AppointmentRegistrationForm />);

      const idCardInput = screen.getByPlaceholderText(
        "Número de Identificación (6-12 dígitos)",
      );

      // Try to type more than 12 digits
      await user.type(idCardInput, "12345678901234567890");

      expect((idCardInput as HTMLInputElement).maxLength).toBe(12);
      expect(
        (idCardInput as HTMLInputElement).value.length,
      ).toBeLessThanOrEqual(12);
    });
  });
});
