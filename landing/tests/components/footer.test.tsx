import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/footer";

describe("Footer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render a <footer> element", () => {
    render(
      <Footer firstName="Роман" lastName="Калугер" patronymic="Юрьевич" />
    );

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("should render copyright with current year", () => {
    vi.spyOn(Date.prototype, "getFullYear").mockReturnValue(2026);

    render(
      <Footer firstName="Роман" lastName="Калугер" patronymic="Юрьевич" />
    );

    expect(
      screen.getByText((content) => content.includes("2026"))
    ).toBeInTheDocument();
  });

  it("should render full name (lastName firstName patronymic)", () => {
    render(
      <Footer firstName="Роман" lastName="Калугер" patronymic="Юрьевич" />
    );

    expect(
      screen.getByText((content) =>
        content.includes("Калугер Роман Юрьевич")
      )
    ).toBeInTheDocument();
  });

  it('should render "Все права защищены"', () => {
    render(
      <Footer firstName="Роман" lastName="Калугер" patronymic="Юрьевич" />
    );

    expect(screen.getByText("Все права защищены")).toBeInTheDocument();
  });
});
