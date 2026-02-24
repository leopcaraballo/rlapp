import { render, screen } from "@testing-library/react";

import RootLayout from "@/app/layout";
import AppointmentCard from "@/components/AppointmentCard/AppointmentCard";
import {
  DependencyProvider,
  useDependencies,
} from "@/context/DependencyContext";

beforeAll(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
});

const Consumer = () => {
  const deps = useDependencies();
  return (
    <div>{deps.repository && deps.realTime ? "deps-ready" : "missing"}</div>
  );
};

describe("DependencyContext", () => {
  it("provides dependencies to children", () => {
    render(
      <DependencyProvider>
        <Consumer />
      </DependencyProvider>,
    );

    expect(screen.getByText("deps-ready")).toBeInTheDocument();
  });

  it("throws when used outside provider", () => {
    const ErrorConsumer = () => {
      useDependencies();
      return null;
    };

    expect(() => render(<ErrorConsumer />)).toThrow(/useDependencies/);
  });
});

describe("AppointmentCard (deprecated)", () => {
  it("renders with priority badge and time", () => {
    const now = 1735660800000;
    const appointment = {
      id: "1",
      fullName: "Test User",
      idCard: 123,
      office: "A1",
      timestamp: now,
      status: "waiting" as const,
      priority: "high" as const,
    };

    render(
      <AppointmentCard
        appointment={appointment}
        status="waiting"
        showTime
        timeIcon="🕒"
      />,
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText(/Alta/)).toBeInTheDocument();
    expect(screen.getByText("🕒")).toBeInTheDocument();
  });
});

describe("RootLayout", () => {
  it("wraps children with provider", () => {
    const tree = RootLayout({ children: <div>child</div> });
    expect(tree.props.children).toBeDefined();
  });
});
