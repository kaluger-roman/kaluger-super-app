import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callFullscreenModel, callModel, callZoomModel } from "../../../model";
import { ZoomControls } from "../ZoomControls";
import { formatZoomPercent } from "../ZoomControls.helpers";

const createScope = (scale: number) =>
  fork({
    values: [
      [callFullscreenModel.$isFullscreen, true],
      [
        callModel.$peerMediaState,
        { micOn: true, cameraOn: true, screenSharing: true, cameraAvailable: true },
      ],
      [callZoomModel.$zoom, { scale, offsetX: 0, offsetY: 0 }],
    ],
  });

const renderControls = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <ZoomControls />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("ZoomControls", () => {
  it("should start at 100% with nothing to zoom out of", () => {
    renderControls(createScope(1));

    expect(screen.getByRole("group", { name: "Масштаб демонстрации" })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Уменьшить" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Исходный размер" })).not.toBeInTheDocument();
  });

  it("should zoom in by a step and offer the original size", async () => {
    renderControls(createScope(1));

    await userEvent.click(screen.getByRole("button", { name: "Увеличить" }));

    expect(screen.getByText("150%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Уменьшить" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Исходный размер" })).toBeInTheDocument();
  });

  it("should zoom out by a step", async () => {
    renderControls(createScope(2));

    await userEvent.click(screen.getByRole("button", { name: "Уменьшить" }));

    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  it("should return to 100% with «Исходный размер»", async () => {
    const scope = createScope(2.5);
    renderControls(scope);

    await userEvent.click(screen.getByRole("button", { name: "Исходный размер" }));

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Исходный размер" })).not.toBeInTheDocument();
    expect(scope.getState(callZoomModel.$zoom).scale).toBe(1);
  });

  it("should not zoom in past 400%", () => {
    renderControls(createScope(4));

    expect(screen.getByText("400%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Увеличить" })).toBeDisabled();
  });

  it("should format the scale as a whole percent", () => {
    expect(formatZoomPercent(1)).toBe("100%");
    expect(formatZoomPercent(1.234)).toBe("123%");
  });

  it("should keep the room of «Исходный размер» at 100%, so «+» does not move under the cursor (regression)", async () => {
    renderControls(createScope(1));
    const reset = screen.getByTestId("zoom-reset");
    expect(reset).toHaveAttribute("data-visible", "false");
    expect(reset).toHaveAttribute("tabindex", "-1");

    await userEvent.click(screen.getByRole("button", { name: "Увеличить" }));

    expect(screen.getByTestId("zoom-reset")).toBe(reset);
    expect(reset).toHaveAttribute("data-visible", "true");
  });
});
