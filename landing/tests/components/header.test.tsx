import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/header";

describe("Header", () => {
  it("should render a semantic <nav> element", () => {
    render(<Header />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("should render all navigation links", () => {
    render(<Header />);

    const expectedLabels = [
      "Обо мне",
      "Образование",
      "Сертификаты",
      "Условия",
      "Отзывы",
      "Контакты",
    ];

    for (const label of expectedLabels) {
      const links = screen.getAllByText(label);
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it("should render navigation links with correct href attributes", () => {
    render(<Header />);

    const expectedHrefs: Record<string, string> = {
      "Обо мне": "#about",
      Образование: "#education",
      Сертификаты: "#certificates",
      Условия: "#conditions",
      Отзывы: "#reviews",
      Контакты: "#contacts",
    };

    for (const [label, href] of Object.entries(expectedHrefs)) {
      const links = screen.getAllByText(label);
      for (const link of links) {
        expect(link.closest("a")).toHaveAttribute("href", href);
      }
    }
  });

  it("should render hamburger button", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: "Открыть меню" });
    expect(button).toBeInTheDocument();
  });

  it("should toggle mobile menu when hamburger button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const button = screen.getByRole("button", { name: "Открыть меню" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-label", "Закрыть меню");

    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-label", "Открыть меню");
  });
});
