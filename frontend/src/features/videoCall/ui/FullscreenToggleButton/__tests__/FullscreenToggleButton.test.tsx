import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callFullscreenModel } from "../../../model";
import { FullscreenToggleButton } from "../FullscreenToggleButton";

const renderButton = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <FullscreenToggleButton placement="tile" />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("FullscreenToggleButton", () => {
  it("should enter the mode from the regular view", async () => {
    const scope = fork();
    renderButton(scope);

    await userEvent.click(screen.getByRole("button", { name: "Во весь экран" }));

    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(true);
  });

  it("should leave the mode with «Свернуть»", async () => {
    const scope = fork({ values: [[callFullscreenModel.$isFullscreen, true]] });
    renderButton(scope);

    await userEvent.click(screen.getByRole("button", { name: "Свернуть" }));

    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(false);
  });
});
