import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { callModel } from "@features/videoCall";

import { AppLoadingScreen } from "../../AppLoadingScreen";
import { AppFrame } from "../AppFrame";

const incomingScope = () =>
  fork({
    values: [
      [callModel.$callPhase, "incoming"],
      [callModel.$incomingCall, { callId: "call-1", callerName: "Анна Петрова", role: "tutor" }],
    ],
  });

describe("AppFrame", () => {
  it("should show an incoming call while the app is still loading", () => {
    render(
      <EffectorProvider value={incomingScope()}>
        <AppFrame>
          <AppLoadingScreen />
        </AppFrame>
      </EffectorProvider>
    );

    // The modal call dialog hides the spinner behind it from assistive tech.
    expect(screen.getByRole("progressbar", { hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Принять вызов" })).toBeInTheDocument();
  });

  it("should keep the same call dialog when loading ends", () => {
    const scope = incomingScope();
    const { rerender } = render(
      <EffectorProvider value={scope}>
        <AppFrame>
          <AppLoadingScreen />
        </AppFrame>
      </EffectorProvider>
    );
    const acceptButton = screen.getByRole("button", { name: "Принять вызов" });

    rerender(
      <EffectorProvider value={scope}>
        <AppFrame>
          <main>Приложение</main>
        </AppFrame>
      </EffectorProvider>
    );

    expect(screen.getByRole("button", { name: "Принять вызов" })).toBe(acceptButton);
  });
});
