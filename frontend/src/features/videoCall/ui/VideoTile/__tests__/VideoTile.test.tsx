import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { VideoTile } from "../VideoTile";

const renderTile = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("VideoTile", () => {
  it("should show the camera-off placeholder when the camera is off", () => {
    renderTile(
      <VideoTile
        name="Иван"
        micOn
        cameraOn={false}
        screenSharing={false}
        audioOnly={false}
      />
    );
    expect(screen.getByText("Камера выключена")).toBeInTheDocument();
  });

  it("should show the camera-unavailable label in audio-only mode", () => {
    renderTile(
      <VideoTile
        name="Иван"
        micOn
        cameraOn={false}
        screenSharing={false}
        audioOnly
      />
    );
    expect(screen.getByText("Камера недоступна")).toBeInTheDocument();
  });

  it("should show the muted-mic badge when the peer mic is off", () => {
    renderTile(
      <VideoTile
        name="Иван"
        micOn={false}
        cameraOn
        screenSharing={false}
        audioOnly={false}
      />
    );
    expect(screen.getByLabelText("Микрофон выключен")).toBeInTheDocument();
  });

  it("should render the participant name pill", () => {
    renderTile(
      <VideoTile
        name="Иван Смирнов"
        micOn
        cameraOn
        screenSharing={false}
        audioOnly={false}
      />
    );
    expect(screen.getByText("Иван Смирнов")).toBeInTheDocument();
  });
});
