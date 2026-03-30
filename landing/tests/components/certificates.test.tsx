import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CertificatesSection } from "@/components/certificates";
import type { Certificate } from "@/types";

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

const mockItems: Certificate[] = [
  { title: "Сертификат ФИПИ", year: 2023, image: "/images/cert.webp" },
  { title: "Олимпиадная подготовка", year: 2022 },
];

describe("CertificatesSection", () => {
  it("renders certificates with title", () => {
    render(<CertificatesSection items={mockItems} />);

    expect(screen.getByText("Сертификат ФИПИ")).toBeInTheDocument();
    // "Олимпиадная подготовка" appears both in the placeholder and as a <p> title
    const elements = screen.getAllByText("Олимпиадная подготовка");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders year for each certificate", () => {
    render(<CertificatesSection items={mockItems} />);

    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("2022")).toBeInTheDocument();
  });

  it("hides section when items array is empty", () => {
    const { container } = render(<CertificatesSection items={[]} />);

    expect(container.firstChild).not.toBeInTheDocument();
  });

  it('renders heading "Сертификаты" when items exist', () => {
    render(<CertificatesSection items={mockItems} />);

    expect(
      screen.getByRole("heading", { name: "Сертификаты" }),
    ).toBeInTheDocument();
  });

  it("renders image when certificate has image property", () => {
    render(<CertificatesSection items={mockItems} />);

    const img = screen.getByAltText("Сертификат ФИПИ");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/cert.webp");
  });

  it("renders placeholder when no image", () => {
    render(<CertificatesSection items={[mockItems[1]]} />);

    const images = screen.queryAllByRole("img");
    expect(images).toHaveLength(0);

    // The placeholder div contains the title text
    const allTitleTexts = screen.getAllByText("Олимпиадная подготовка");
    // One in the placeholder div, one in the <p> below
    expect(allTitleTexts.length).toBeGreaterThanOrEqual(2);
  });
});
