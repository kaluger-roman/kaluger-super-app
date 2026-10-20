import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel } from "../../../model";
import type { CallMediaState } from "../../../videoCall.types";
import { CallControlBar } from "../CallControlBar";

const renderBar = (
  self: CallMediaState,
  peer: CallMediaState = {
    micOn: true,
    cameraOn: true,
    screenSharing: false,
    cameraAvailable: true,
  },
  screenShareSupported = true
) => {
  const scope = fork({
    values: [
      [callModel.$selfMediaState, self],
      [callModel.$peerMediaState, peer],
      [callModel.$screenShareSupported, screenShareSupported],
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
  it("should label the mic button by the current state", () => {
    renderBar({ micOn: true, cameraOn: true, screenSharing: false, cameraAvailable: true });
    expect(screen.getByRole("button", { name: "Выключить микрофон" })).toBeInTheDocument();
  });

  it("should show the enable-mic label when muted", () => {
    renderBar({ micOn: false, cameraOn: true, screenSharing: false, cameraAvailable: true });
    expect(screen.getByRole("button", { name: "Включить микрофон" })).toBeInTheDocument();
  });

  it("should keep screen share clickable when the peer is already sharing", () => {
    renderBar(
      { micOn: true, cameraOn: true, screenSharing: false, cameraAvailable: true },
      { micOn: true, cameraOn: true, screenSharing: true, cameraAvailable: true }
    );
    expect(screen.getByRole("button", { name: "Демонстрация экрана" })).toBeEnabled();
  });

  it("should hide screen share when the browser cannot capture the screen", () => {
    renderBar(
      { micOn: true, cameraOn: true, screenSharing: false, cameraAvailable: true },
      undefined,
      false
    );
    expect(screen.queryByRole("button", { name: "Демонстрация экрана" })).not.toBeInTheDocument();
  });

  it("should dispatch hangUp when the end-call button is clicked", async () => {
    const { scope } = renderBar({
      micOn: true,
      cameraOn: true,
      screenSharing: false,
      cameraAvailable: true,
    });
    const hangUps: unknown[] = [];
    createWatch({ unit: callModel.hangUp, fn: (payload) => hangUps.push(payload), scope });
    await userEvent.click(screen.getByRole("button", { name: "Завершить звонок" }));
    expect(hangUps).toHaveLength(1);
  });
});
