import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { callModel } from "@features/videoCall";
import { theme } from "@shared";

import { appInitModel } from "../../../model";
import { OfflineIndicator } from "../OfflineIndicator";

const renderIndicator = (phase: "idle" | "active") => {
  const scope = fork({
    values: [
      [appInitModel.$isOnline, false],
      [callModel.$callPhase, phase],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <OfflineIndicator />
      </ThemeProvider>
    </EffectorProvider>
  );
};

const placementOf = (text: RegExp) =>
  screen.getByText(text).closest("[data-placement]")?.getAttribute("data-placement");

describe("OfflineIndicator", () => {
  it("should sit at the bottom outside a call", () => {
    renderIndicator("idle");
    expect(placementOf(/Нет подключения/)).toBe("bottom");
  });

  it("should move to the top during a call so it does not cover the call controls", () => {
    renderIndicator("active");
    expect(placementOf(/Нет подключения/)).toBe("top");
  });
});
