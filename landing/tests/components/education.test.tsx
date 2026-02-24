import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EducationSection } from "@/components/education";
import type { Education } from "@/types";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt as string} className={className as string} />
  ),
}));

// Mock IntersectionObserver (for AnimateOnScroll)
vi.stubGlobal(
  "IntersectionObserver",
  vi.fn(function () {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  }),
);

const mockItems: Education[] = [
  { institution: "МГУ", degree: "Магистр физики", year: 2015 },
  { institution: "МФТИ", degree: "Бакалавр", year: 2013 },
];

describe("EducationSection", () => {
  it("renders education items with institution name", () => {
    render(<EducationSection items={mockItems} />);

    expect(screen.getByText("МГУ")).toBeInTheDocument();
    expect(screen.getByText("МФТИ")).toBeInTheDocument();
  });

  it("renders degree for each item", () => {
    render(<EducationSection items={mockItems} />);

    expect(screen.getByText("Магистр физики")).toBeInTheDocument();
    expect(screen.getByText("Бакалавр")).toBeInTheDocument();
  });

  it("renders year for each item", () => {
    render(<EducationSection items={mockItems} />);

    expect(screen.getByText("2015")).toBeInTheDocument();
    expect(screen.getByText("2013")).toBeInTheDocument();
  });

  it('renders heading "Образование"', () => {
    render(<EducationSection items={mockItems} />);

    expect(
      screen.getByRole("heading", { name: "Образование" }),
    ).toBeInTheDocument();
  });
});
