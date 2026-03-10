/**
 * 🧪 Tests for AppointmentSkeleton component
 *
 * Tests the appointment loading skeleton placeholder
 */

import { render } from "@testing-library/react";

import AppointmentSkeleton from "@/components/AppointmentSkeleton";

describe("AppointmentSkeleton", () => {
  describe("Default Rendering", () => {
    it("should render 5 skeleton cards by default", () => {
      const { container } = render(<AppointmentSkeleton />);

      const skeletonCards = container.querySelectorAll(
        '[class*="skeletonCard"]',
      );
      expect(skeletonCards).toHaveLength(5);
    });

    it("should render as a list", () => {
      const { container } = render(<AppointmentSkeleton />);

      const list = container.querySelector("ul");
      expect(list).toBeInTheDocument();
    });

    it("should render list items for skeleton cards", () => {
      const { container } = render(<AppointmentSkeleton />);

      const listItems = container.querySelectorAll("li");
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe("Custom Count", () => {
    it("should render custom count when count prop is provided", () => {
      const { container } = render(<AppointmentSkeleton count={3} />);

      const skeletonCards = container.querySelectorAll(
        '[class*="skeletonCard"]',
      );
      expect(skeletonCards).toHaveLength(3);
    });

    it("should render single skeleton card when count=1", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const skeletonCards = container.querySelectorAll(
        '[class*="skeletonCard"]',
      );
      expect(skeletonCards).toHaveLength(1);
    });

    it("should render many skeleton cards when count is large", () => {
      const { container } = render(<AppointmentSkeleton count={10} />);

      const skeletonCards = container.querySelectorAll(
        '[class*="skeletonCard"]',
      );
      expect(skeletonCards).toHaveLength(10);
    });

    it("should render zero cards when count=0", () => {
      const { container } = render(<AppointmentSkeleton count={0} />);

      const skeletonCards = container.querySelectorAll(
        '[class*="skeletonCard"]',
      );
      expect(skeletonCards).toHaveLength(0);
    });
  });

  describe("Structure", () => {
    it("should have skeleton header section", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const header = container.querySelector('[class*="skeletonHeader"]');
      expect(header).toBeInTheDocument();
    });

    it("should have skeleton content section", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const content = container.querySelector('[class*="skeletonContent"]');
      expect(content).toBeInTheDocument();
    });

    it("should have skeleton footer section", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const footer = container.querySelector('[class*="skeletonFooter"]');
      expect(footer).toBeInTheDocument();
    });

    it("should have skeleton lines for text placeholders", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const skeletonLines = container.querySelectorAll(
        '[class*="skeletonLine"]',
      );
      expect(skeletonLines.length).toBeGreaterThan(0);
    });

    it("should have skeleton badge for status placeholder", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const badge = container.querySelector('[class*="skeletonBadge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should apply CSS classes for animation", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const skeletonCard = container.querySelector('[class*="skeletonCard"]');
      expect(skeletonCard?.className).toBeTruthy();
      expect(skeletonCard?.className).toMatch(/skeleton/);
    });

    it("should apply grid layout class to container", () => {
      const { container } = render(<AppointmentSkeleton />);

      const grid = container.querySelector('[class*="skeletonGrid"]');
      expect(grid).toBeInTheDocument();
    });

    it("should have varying widths for skeleton lines", () => {
      const { container } = render(<AppointmentSkeleton count={1} />);

      const lines = container.querySelectorAll('[class*="skeletonLine"]');
      const widths = Array.from(lines).map(
        (line) => (line as HTMLElement).style.width,
      );

      // Should have different widths to look more realistic
      const uniqueWidths = new Set(widths);
      expect(uniqueWidths.size).toBeGreaterThan(1);
    });
  });

  describe("Accessibility", () => {
    it("should not have interactive elements", () => {
      const { container } = render(<AppointmentSkeleton />);

      const buttons = container.querySelectorAll("button");
      const links = container.querySelectorAll("a");
      const inputs = container.querySelectorAll("input");

      expect(buttons.length + links.length + inputs.length).toBe(0);
    });

    it("should be semantic list structure", () => {
      const { container } = render(<AppointmentSkeleton />);

      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();

      const listItems = ul?.querySelectorAll("li");
      expect(listItems?.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should not have unique keys causing re-renders", () => {
      const { container } = render(<AppointmentSkeleton count={3} />);

      const listItems = container.querySelectorAll("li");
      const keys = Array.from(listItems).map((_, index) => index);

      // Keys should be numeric indices
      expect(keys).toEqual([0, 1, 2]);
    });

    it("should handle large counts efficiently", () => {
      const { container } = render(<AppointmentSkeleton count={100} />);

      const listItems = container.querySelectorAll("li");
      expect(listItems).toHaveLength(100);
    });
  });
});
