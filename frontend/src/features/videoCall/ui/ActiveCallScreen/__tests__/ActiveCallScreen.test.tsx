import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel } from "../../../model";
import { ActiveCallScreen } from "../ActiveCallScreen";

const renderScreen = (peerSharing: boolean, selfCameraOn = true) => {
  const scope = fork({
    values: [
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
    expect(screen.getByTestId("local-pip")).toHaveStyle({ width: "132px", height: "80px" });
  });

  it("should keep the regular own tile size otherwise", () => {
    renderScreen(false);
    expect(screen.getByTestId("local-pip")).toHaveStyle({ width: "220px", height: "132px" });
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
