import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Conditions } from "@/components/conditions";
import type { Subject } from "@/types";

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

const mockItems: Subject[] = [
  { name: "Математика", levels: ["ЕГЭ", "ОГЭ"], duration: 60, price: 2500 },
  { name: "Физика", levels: ["ЕГЭ"], duration: 90, price: 2500 },
];

describe("Conditions", () => {
  it("renders subject name", () => {
    render(<Conditions items={mockItems} />);

    expect(screen.getByText("Математика")).toBeInTheDocument();
    expect(screen.getByText("Физика")).toBeInTheDocument();
  });

  it("renders levels as tags", () => {
    render(<Conditions items={mockItems} />);

    const egeTags = screen.getAllByText("ЕГЭ");
    expect(egeTags).toHaveLength(2);
    expect(screen.getByText("ОГЭ")).toBeInTheDocument();
  });

  it("renders duration text", () => {
    render(<Conditions items={mockItems} />);

    expect(screen.getByText(/60/)).toBeInTheDocument();
    // "минут" appears in both subject cards
    const durationTexts = screen.getAllByText(/минут/);
    expect(durationTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders price with \u20BD symbol", () => {
    render(<Conditions items={mockItems} />);

    const priceElements = screen.getAllByText(/₽/);
    expect(priceElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders heading "Условия занятий"', () => {
    render(<Conditions items={mockItems} />);

    expect(
      screen.getByRole("heading", { name: "Условия занятий" }),
    ).toBeInTheDocument();
  });

  it('renders "Только онлайн" badge', () => {
    render(<Conditions items={mockItems} />);

    expect(screen.getByText("Только онлайн")).toBeInTheDocument();
  });
});
