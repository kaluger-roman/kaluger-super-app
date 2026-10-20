import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { VideoTile } from "../VideoTile";

const renderTile = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("VideoTile screen share", () => {
  it("should show the screen-share indicator when screenSharing is true", () => {
    renderTile(<VideoTile name="Иван" micOn cameraOn screenSharing audioOnly={false} />);
    expect(screen.getAllByText("Демонстрация экрана").length).toBeGreaterThan(0);
  });

  it("should not show the screen-share indicator when not sharing", () => {
    renderTile(<VideoTile name="Иван" micOn cameraOn screenSharing={false} audioOnly={false} />);
    expect(screen.queryByText("Демонстрация экрана")).not.toBeInTheDocument();
  });

  it("should show a shared window whole instead of cropping it to the tile", () => {
    const stream = new MediaStream();
    const { container, rerender } = renderTile(
      <VideoTile name="Иван" micOn cameraOn screenSharing audioOnly={false} stream={stream} />
    );
    expect(container.querySelector("video")).toHaveStyle({ objectFit: "contain" });

    rerender(
      <ThemeProvider theme={theme}>
        <VideoTile
          name="Иван"
          micOn
          cameraOn
          screenSharing={false}
          audioOnly={false}
          stream={stream}
        />
      </ThemeProvider>
    );
    expect(container.querySelector("video")).toHaveStyle({ objectFit: "cover" });
  });

  it("should keep the shared screen clear of the label pills", () => {
    const { container } = renderTile(
      <VideoTile
        name="Иван"
        micOn
        cameraOn
        screenSharing
        audioOnly={false}
        stream={new MediaStream()}
      />
    );
    expect(container.querySelector("video")).toHaveStyle({ top: "44px", bottom: "44px" });
  });

  it("should not pad the own screen preview in the small tile", () => {
    const { container } = renderTile(
      <VideoTile
        name="Вы"
        micOn
        cameraOn
        screenSharing
        audioOnly={false}
        stream={new MediaStream()}
        isSelf
      />
    );
    expect(container.querySelector("video")).toHaveStyle({ top: "0px", height: "100%" });
  });
});
