import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { callModel } from "@features/videoCall";
import { theme } from "@shared";

import { AppLoadingScreen } from "../AppLoadingScreen";

describe("AppLoadingScreen", () => {
  it("should show an incoming call while the app is still loading", () => {
    const scope = fork({
      values: [
        [callModel.$callPhase, "incoming"],
        [callModel.$incomingCall, { callId: "call-1", callerName: "Анна Петрова", role: "tutor" }],
      ],
    });

    render(
      <EffectorProvider value={scope}>
        <ThemeProvider theme={theme}>
          <AppLoadingScreen />
        </ThemeProvider>
      </EffectorProvider>
    );

    // The modal call dialog hides the spinner behind it from assistive tech.
    expect(screen.getByRole("progressbar", { hidden: true })).toBeInTheDocument();
    expect(screen.getByText("Анна Петрова")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Принять вызов" })).toBeInTheDocument();
  });
});
