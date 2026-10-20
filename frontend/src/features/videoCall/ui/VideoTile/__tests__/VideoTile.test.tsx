import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import type { CallMediaState } from "../../../videoCall.types";
import { VideoTile } from "../VideoTile";

const media = (overrides: Partial<CallMediaState> = {}): CallMediaState => ({
  micOn: true,
  cameraOn: true,
  screenSharing: false,
  cameraAvailable: true,
  ...overrides,
});

const renderTile = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("VideoTile", () => {
  it("should show the camera-off placeholder when the camera is off", () => {
    renderTile(<VideoTile name="Иван" media={media({ cameraOn: false })} variant="remote" />);
    expect(screen.getByText("Камера выключена")).toBeInTheDocument();
  });

  it("should show the camera-unavailable label in audio-only mode", () => {
    renderTile(
      <VideoTile
        name="Иван"
        media={media({ cameraOn: false, cameraAvailable: false })}
        variant="remote"
      />
    );
    expect(screen.getByText("Камера недоступна")).toBeInTheDocument();
  });

  it("should hide the camera-off label in the compact own tile", () => {
    renderTile(<VideoTile name="Вы" media={media({ cameraOn: false })} variant="selfCompact" />);
    expect(screen.queryByText("Камера выключена")).not.toBeInTheDocument();
  });

  it("should show the muted-mic badge when the mic is off", () => {
    renderTile(<VideoTile name="Иван" media={media({ micOn: false })} variant="remote" />);
    expect(screen.getByLabelText("Микрофон выключен")).toBeInTheDocument();
  });

  it("should put the muted-mic badge next to the name in the own tile", () => {
    renderTile(
      <VideoTile name="Вы" media={media({ micOn: false, cameraOn: false })} variant="selfCompact" />
    );
    expect(screen.getByLabelText("Микрофон выключен").parentElement).toContainElement(
      screen.getByText("Вы")
    );
  });

  it("should render the participant name pill", () => {
    renderTile(<VideoTile name="Иван Смирнов" media={media()} variant="remote" />);
    expect(screen.getByText("Иван Смирнов")).toBeInTheDocument();
  });

  it("should show a person icon instead of initials in the own placeholder", () => {
    renderTile(<VideoTile name="Вы" media={media({ cameraOn: false })} variant="self" />);
    expect(screen.getByTestId("PersonIcon")).toBeInTheDocument();
    expect(screen.queryByText("В")).not.toBeInTheDocument();
  });
});
