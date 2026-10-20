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
      <VideoTile name="Иван" micOn cameraOn={false} screenSharing={false} audioOnly={false} />
    );
    expect(screen.getByText("Камера выключена")).toBeInTheDocument();
  });

  it("should show the camera-unavailable label in audio-only mode", () => {
    renderTile(<VideoTile name="Иван" micOn cameraOn={false} screenSharing={false} audioOnly />);
    expect(screen.getByText("Камера недоступна")).toBeInTheDocument();
  });

  it("should hide the camera-off label in a compact tile", () => {
    renderTile(
      <VideoTile
        name="Вы"
        micOn
        cameraOn={false}
        screenSharing={false}
        audioOnly={false}
        isSelf
        compact
      />
    );
    expect(screen.queryByText("Камера выключена")).not.toBeInTheDocument();
  });

  it("should shrink the muted-mic badge in a compact tile", () => {
    renderTile(
      <VideoTile
        name="Вы"
        micOn={false}
        cameraOn={false}
        screenSharing={false}
        audioOnly={false}
        isSelf
        compact
      />
    );
    expect(screen.getByLabelText("Микрофон выключен")).toHaveStyle({
      width: "20px",
      height: "20px",
    });
  });

  it("should show the muted-mic badge when the peer mic is off", () => {
    renderTile(
      <VideoTile name="Иван" micOn={false} cameraOn screenSharing={false} audioOnly={false} />
    );
    expect(screen.getByLabelText("Микрофон выключен")).toBeInTheDocument();
  });

  it("should render the participant name pill", () => {
    renderTile(
      <VideoTile name="Иван Смирнов" micOn cameraOn screenSharing={false} audioOnly={false} />
    );
    expect(screen.getByText("Иван Смирнов")).toBeInTheDocument();
  });

  it("should show a person icon instead of initials in the own placeholder", () => {
    renderTile(
      <VideoTile name="Вы" micOn cameraOn={false} screenSharing={false} audioOnly={false} isSelf />
    );
    expect(screen.getByTestId("PersonIcon")).toBeInTheDocument();
    expect(screen.queryByText("В")).not.toBeInTheDocument();
  });

  it("should not force the main tile minimum height on the own tile", () => {
    const { container } = renderTile(
      <VideoTile name="Вы" micOn cameraOn={false} screenSharing={false} audioOnly={false} isSelf />
    );
    expect(container.firstElementChild).toHaveStyle({ minHeight: "0" });
  });

  it("should keep the minimum height of the peer tile", () => {
    const { container } = renderTile(
      <VideoTile name="Иван" micOn cameraOn={false} screenSharing={false} audioOnly={false} />
    );
    expect(container.firstElementChild).toHaveStyle({ minHeight: "180px" });
  });
});
