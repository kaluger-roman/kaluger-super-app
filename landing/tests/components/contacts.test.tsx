import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Contacts } from "@/components/contacts";
import type { SocialLink } from "@/types";

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

const mockItems: SocialLink[] = [
  { type: "profi", url: "https://profi.ru/test" },
  { type: "vk", url: "https://vk.com/test" },
  { type: "whatsapp", url: "https://wa.me/123" },
  { type: "telegram", url: "https://t.me/test" },
  { type: "max", url: "https://max.ru/test" },
];

describe("Contacts", () => {
  it("renders all social icons from data", () => {
    const { container } = render(<Contacts items={mockItems} />);

    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(5);
  });

  it("links have target _blank", () => {
    const { container } = render(<Contacts items={mockItems} />);

    const links = container.querySelectorAll("a");
    links.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("links have correct href", () => {
    const { container } = render(<Contacts items={mockItems} />);

    const links = container.querySelectorAll("a");
    expect(links[0]).toHaveAttribute("href", "https://profi.ru/test");
    expect(links[1]).toHaveAttribute("href", "https://vk.com/test");
    expect(links[2]).toHaveAttribute("href", "https://wa.me/123");
    expect(links[3]).toHaveAttribute("href", "https://t.me/test");
    expect(links[4]).toHaveAttribute("href", "https://max.ru/test");
  });

  it("hides section when socials empty", () => {
    const { container } = render(<Contacts items={[]} />);

    expect(container.firstChild).not.toBeInTheDocument();
  });

  it('renders heading "Контакты"', () => {
    render(<Contacts items={mockItems} />);

    expect(
      screen.getByRole("heading", { name: "Контакты" }),
    ).toBeInTheDocument();
  });

  it("renders subtext", () => {
    render(<Contacts items={mockItems} />);

    expect(
      screen.getByText("Свяжитесь со мной удобным способом"),
    ).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    const itemsWithLabel: SocialLink[] = [
      { type: "telegram", url: "https://t.me/test", label: "Телеграм" },
    ];

    render(<Contacts items={itemsWithLabel} />);

    expect(screen.getByText("Телеграм")).toBeInTheDocument();
  });
});
