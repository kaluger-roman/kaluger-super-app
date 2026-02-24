import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProfiIcon } from "@/components/icons/profi-icon";

describe("ProfiIcon", () => {
  it("renders SVG element", () => {
    const { container } = render(<ProfiIcon />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("passes className to SVG", () => {
    const { container } = render(<ProfiIcon className="w-8 h-8" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("w-8", "h-8");
  });

  it("has aria-hidden attribute", () => {
    const { container } = render(<ProfiIcon />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
