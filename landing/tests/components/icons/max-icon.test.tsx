import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MaxIcon } from "@/components/icons/max-icon";

describe("MaxIcon", () => {
  it("renders SVG element", () => {
    const { container } = render(<MaxIcon />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("passes className to SVG", () => {
    const { container } = render(<MaxIcon className="w-8 h-8" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("w-8", "h-8");
  });

  it("has aria-hidden attribute", () => {
    const { container } = render(<MaxIcon />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
