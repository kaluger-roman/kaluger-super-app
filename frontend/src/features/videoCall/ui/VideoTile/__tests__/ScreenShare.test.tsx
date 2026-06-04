import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { VideoTile } from "../VideoTile";

const renderTile = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("VideoTile screen share", () => {
  it("should show the screen-share indicator when screenSharing is true", () => {
    renderTile(
      <VideoTile
        name="Иван"
        micOn
        cameraOn
        screenSharing
        audioOnly={false}
      />
    );
    expect(screen.getAllByText("Демонстрация экрана").length).toBeGreaterThan(0);
  });

  it("should not show the screen-share indicator when not sharing", () => {
    renderTile(
      <VideoTile
        name="Иван"
        micOn
        cameraOn
        screenSharing={false}
        audioOnly={false}
      />
    );
    expect(screen.queryByText("Демонстрация экрана")).not.toBeInTheDocument();
  });
});
