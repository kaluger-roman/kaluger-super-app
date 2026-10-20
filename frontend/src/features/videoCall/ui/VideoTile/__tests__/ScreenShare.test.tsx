import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import type { CallMediaState } from "../../../videoCall.types";
import { VideoTile } from "../VideoTile";

const sharing: CallMediaState = {
  micOn: true,
  cameraOn: true,
  screenSharing: true,
  cameraAvailable: true,
};

const renderTile = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const matchShortStage = () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(max-height: 500px)",
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe("VideoTile screen share", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should show the screen-share indicator while sharing", () => {
    renderTile(<VideoTile name="Иван" media={sharing} variant="remote" />);
    expect(screen.getAllByText("Демонстрация экрана").length).toBeGreaterThan(0);
  });

  it("should not show the screen-share indicator when not sharing", () => {
    renderTile(
      <VideoTile name="Иван" media={{ ...sharing, screenSharing: false }} variant="remote" />
    );
    expect(screen.queryByText("Демонстрация экрана")).not.toBeInTheDocument();
  });

  it("should show a shared window whole instead of cropping it to the tile", () => {
    const stream = new MediaStream();
    const { container, rerender } = renderTile(
      <VideoTile name="Иван" media={sharing} variant="remote" stream={stream} />
    );
    expect(container.querySelector("video")).toHaveStyle({ objectFit: "contain" });

    rerender(
      <ThemeProvider theme={theme}>
        <VideoTile
          name="Иван"
          media={{ ...sharing, screenSharing: false }}
          variant="remote"
          stream={stream}
        />
      </ThemeProvider>
    );
    expect(container.querySelector("video")).toHaveStyle({ objectFit: "cover" });
  });

  it("should frame the peer's shared screen between the pills", () => {
    const { container } = renderTile(
      <VideoTile name="Иван" media={sharing} variant="remote" stream={new MediaStream()} />
    );
    expect(container.querySelector("video")).toHaveAttribute("data-layout", "framed");
  });

  it("should overlay the pills on the peer's shared screen on a short landscape stage", () => {
    matchShortStage();
    const { container } = renderTile(
      <VideoTile name="Иван" media={sharing} variant="remote" stream={new MediaStream()} />
    );
    expect(container.querySelector("video")).toHaveAttribute("data-layout", "overlay");
  });

  it("should let the own screen preview fill the small tile", () => {
    const { container } = renderTile(
      <VideoTile name="Вы" media={sharing} variant="self" stream={new MediaStream()} />
    );
    expect(container.querySelector("video")).toHaveAttribute("data-layout", "overlay");
  });
});
