import { ThemeProvider } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "../../themeConfig";
import { TaxExemptBadge } from "../TaxExemptBadge";

const ARIA_LABEL = "Не облагается налогом: доход по уроку не учитывается в сумме налога";
const DESCRIPTION = "Доход по уроку не учитывается в сумме налога";

const renderBadge = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const badge = () => screen.getByRole("img", { name: ARIA_LABEL });

describe("TaxExemptBadge", () => {
  it("should render nothing when the lesson is taxable", () => {
    const { container } = renderBadge(<TaxExemptBadge isTaxExempt={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render the mark and the short label in the full variant", () => {
    renderBadge(<TaxExemptBadge isTaxExempt />);

    expect(badge()).toHaveTextContent("0%без налога");
  });

  it("should render only the mark in the icon variant", () => {
    renderBadge(<TaxExemptBadge isTaxExempt variant="icon" />);

    expect(badge()).toHaveTextContent(/^0%$/);
    expect(screen.queryByText("без налога")).toBeNull();
  });

  it("should open the hint on mouse hover", async () => {
    const user = userEvent.setup();
    renderBadge(<TaxExemptBadge isTaxExempt />);

    await user.hover(badge());

    expect(await screen.findByText(DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Не облагается налогом");
  });

  it("should open the hint on keyboard focus", async () => {
    renderBadge(<TaxExemptBadge isTaxExempt />);

    fireEvent.focus(badge());

    expect(await screen.findByText(DESCRIPTION)).toBeInTheDocument();
  });

  it("should open the hint on tap without bubbling the click", async () => {
    const parentClick = vi.fn();
    renderBadge(
      <div onClick={parentClick}>
        <TaxExemptBadge isTaxExempt variant="icon" />
      </div>
    );

    const element = badge();
    fireEvent.pointerEnter(element, { pointerType: "touch" });
    fireEvent.click(element);
    fireEvent.pointerLeave(element, { pointerType: "touch" });

    expect(await screen.findByText(DESCRIPTION)).toBeInTheDocument();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
