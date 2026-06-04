import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { callModel, setCallTransport, stopAllSessions } from "../../../model";
import type { CallMediaState } from "../../../videoCall.types";
import { CallControlBar } from "../CallControlBar";

const renderBar = (
  self: CallMediaState,
  peer: CallMediaState = { micOn: true, cameraOn: true, screenSharing: false }
) => {
  const scope = fork({
    values: [
      [callModel.$selfMediaState, self],
      [callModel.$peerMediaState, peer],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallControlBar />
      </ThemeProvider>
    </EffectorProvider>
  );
  return { scope };
};

describe("CallControlBar", () => {
  beforeEach(() => setCallTransport(vi.fn()));
  afterEach(() => {
    stopAllSessions();
    setCallTransport(null);
  });

  it("should label the mic button by the current state", () => {
    renderBar({ micOn: true, cameraOn: true, screenSharing: false });
    expect(
      screen.getByRole("button", { name: "Выключить микрофон" })
    ).toBeInTheDocument();
  });

  it("should show the enable-mic label when muted", () => {
    renderBar({ micOn: false, cameraOn: true, screenSharing: false });
    expect(
      screen.getByRole("button", { name: "Включить микрофон" })
    ).toBeInTheDocument();
  });

  it("should disable screen share when the peer is already sharing", () => {
    renderBar(
      { micOn: true, cameraOn: true, screenSharing: false },
      { micOn: true, cameraOn: true, screenSharing: true }
    );
    expect(
      screen.getByRole("button", { name: "Демонстрация экрана" })
    ).toBeDisabled();
  });

  it("should dispatch hangUp when the end-call button is clicked", async () => {
    const { scope } = renderBar({ micOn: true, cameraOn: true, screenSharing: false });
    await userEvent.click(
      screen.getByRole("button", { name: "Завершить звонок" })
    );
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });
});
