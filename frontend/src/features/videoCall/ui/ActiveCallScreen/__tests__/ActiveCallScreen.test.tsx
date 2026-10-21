import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel } from "../../../model";
import type { CallPhase } from "../../../model/call.types";
import { ActiveCallScreen } from "../ActiveCallScreen";

const renderScreen = (peerSharing: boolean, selfCameraOn = true, phase: CallPhase = "active") => {
  const scope = fork({
    values: [
      [callModel.$callPhase, phase],
      [
        callModel.$peerMediaState,
        { micOn: true, cameraOn: true, screenSharing: peerSharing, cameraAvailable: true },
      ],
      [
        callModel.$selfMediaState,
        { micOn: true, cameraOn: selfCameraOn, screenSharing: false, cameraAvailable: true },
      ],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <ActiveCallScreen />
      </ThemeProvider>
    </EffectorProvider>
  );
};

describe("ActiveCallScreen", () => {
  it("should shrink the own tile while the peer shares a screen", () => {
    renderScreen(true);
    expect(screen.getByTestId("local-pip")).toHaveAttribute("data-compact", "true");
  });

  it("should keep the regular own tile otherwise", () => {
    renderScreen(false);
    expect(screen.getByTestId("local-pip")).toHaveAttribute("data-compact", "false");
  });

  it("should show the connecting banner until media connects", () => {
    renderScreen(false, true, "connecting");
    expect(screen.getByRole("status")).toHaveTextContent("Соединение…");
  });

  it("should not show the connecting banner once connected", () => {
    renderScreen(false);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should drop the camera-off label from the compact own tile", () => {
    renderScreen(true, false);
    expect(screen.queryByText("Камера выключена")).not.toBeInTheDocument();
  });

  it("should keep the camera-off label in the regular own tile", () => {
    renderScreen(false, false);
    expect(screen.getByText("Камера выключена")).toBeInTheDocument();
  });
});
