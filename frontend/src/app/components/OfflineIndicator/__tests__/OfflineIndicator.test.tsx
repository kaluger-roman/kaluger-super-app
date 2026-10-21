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

const fixedBoxOf = (text: RegExp): HTMLElement => {
  let current: HTMLElement | null = screen.getByText(text);
  while (current && getComputedStyle(current).position !== "fixed") {
    current = current.parentElement;
  }
  if (!current) throw new Error("No fixed ancestor");
  return current;
};

describe("OfflineIndicator", () => {
  it("should sit at the bottom outside a call", () => {
    renderIndicator("idle");
    const style = getComputedStyle(fixedBoxOf(/Нет подключения/));
    expect(style.bottom).not.toBe("");
    expect(style.top).toBe("");
  });

  it("should move to the top during a call so it does not cover the call controls", () => {
    renderIndicator("active");
    const style = getComputedStyle(fixedBoxOf(/Нет подключения/));
    expect(style.top).not.toBe("");
    expect(style.bottom).toBe("");
  });
});
