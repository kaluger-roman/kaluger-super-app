import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { theme } from "../../themeConfig";
import { PermissionDeniedHelp } from "../PermissionDeniedHelp";
import { DENIED_STEPS, DENIED_TEXT } from "../PermissionDeniedHelp.constants";

describe("PermissionDeniedHelp", () => {
  it("should explain how to allow notifications on every kind of device", () => {
    render(
      <ThemeProvider theme={theme}>
        <PermissionDeniedHelp />
      </ThemeProvider>
    );

    expect(screen.getByText(DENIED_TEXT)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(DENIED_STEPS);
  });
});
