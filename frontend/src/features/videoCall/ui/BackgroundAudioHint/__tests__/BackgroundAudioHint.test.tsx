import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { backgroundHintModel, callModel, callPresenceModel } from "../../../model";
import { BACKGROUND_HINT_DISMISSED_KEY } from "../../../model/backgroundHint.constants";
import { BACKGROUND_AUDIO_HINT_TEXT } from "../../../videoCall.constants";
import { BackgroundAudioHint } from "../BackgroundAudioHint";

const IOS = { audio: false, video: false };
const DESKTOP = { audio: true, video: true };

const inActiveCall = (capability = IOS, dismissed = false): Scope =>
  fork({
    values: [
      [callModel.$callPhase, "active"],
      [callPresenceModel.$backgroundCapability, capability],
      [backgroundHintModel.$isHintDismissed, dismissed],
    ],
  });

const renderHint = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <BackgroundAudioHint />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("BackgroundAudioHint", () => {
  it("should tell an iPhone user that the peer does not hear them while the app is minimized", () => {
    renderHint(inActiveCall());

    expect(screen.getByRole("note")).toHaveTextContent(BACKGROUND_AUDIO_HINT_TEXT);
  });

  it("should stay hidden where the microphone keeps going in the background", () => {
    renderHint(inActiveCall(DESKTOP));

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("should stay hidden once dismissed on this device", () => {
    renderHint(inActiveCall(IOS, true));

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("should close and remember the choice on the close button", async () => {
    const user = userEvent.setup();
    const scope = inActiveCall();
    renderHint(scope);

    await user.click(screen.getByRole("button", { name: "Закрыть подсказку" }));

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(scope.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(false);
    expect(localStorage.getItem(BACKGROUND_HINT_DISMISSED_KEY)).toBe("1");
  });
});
