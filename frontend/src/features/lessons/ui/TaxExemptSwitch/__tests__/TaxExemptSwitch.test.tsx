import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { TaxExemptSwitch } from "../TaxExemptSwitch";

const HINT = "Доход по уроку не войдёт в сумму налога в статистике";

const renderSwitch = (props: Partial<Parameters<typeof TaxExemptSwitch>[0]> = {}) => {
  const onChange = vi.fn();
  const view = render(
    <ThemeProvider theme={theme}>
      <TaxExemptSwitch checked={false} onChange={onChange} {...props} />
    </ThemeProvider>
  );
  return { ...view, onChange };
};

describe("TaxExemptSwitch", () => {
  it("should render a switch, not a checkbox, labelled «Не облагается налогом»", () => {
    renderSwitch();

    expect(screen.getByRole("switch", { name: "Не облагается налогом" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Не облагается налогом" })).toBeNull();
  });

  it.each([true, false])("should reflect checked = %s", (checked) => {
    renderSwitch({ checked });

    const control = screen.getByRole("switch", { name: "Не облагается налогом" });
    expect((control as HTMLInputElement).checked).toBe(checked);
  });

  it.each([true, false])("should call onChange with the opposite of %s", async (checked) => {
    const { onChange } = renderSwitch({ checked });

    await userEvent.click(screen.getByRole("switch", { name: "Не облагается налогом" }));

    expect(onChange).toHaveBeenCalledWith(!checked);
  });

  it("should not call onChange when disabled", async () => {
    const { onChange } = renderSwitch({ disabled: true });
    const control = screen.getByRole("switch", { name: "Не облагается налогом" });

    expect(control).toBeDisabled();
    await userEvent.setup({ pointerEventsCheck: 0 }).click(control);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("should describe the switch with the hint", () => {
    renderSwitch({ hint: HINT });

    expect(
      screen.getByRole("switch", { name: "Не облагается налогом", description: HINT })
    ).toBeInTheDocument();
  });

  it("should render no hint when it is not passed", () => {
    renderSwitch();

    expect(screen.queryByText(HINT)).toBeNull();
    expect(screen.getByRole("switch", { name: "Не облагается налогом" })).not.toHaveAttribute(
      "aria-describedby"
    );
  });

  it("should not let a click on the label bubble to the parent", async () => {
    const parentClick = vi.fn();
    const onChange = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <div onClick={parentClick}>
          <TaxExemptSwitch checked={false} onChange={onChange} />
        </div>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText("Не облагается налогом"));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
