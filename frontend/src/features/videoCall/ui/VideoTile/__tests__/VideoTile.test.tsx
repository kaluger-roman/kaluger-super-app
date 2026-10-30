import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel, callPresenceModel } from "../../../model";
import type { CallMediaState, PeerPresenceState } from "../../../videoCall.types";
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

const renderInScope = (scope: Scope, ui: React.ReactElement) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </EffectorProvider>
  );

const minimizedStudent = (presence: Partial<PeerPresenceState> = {}) =>
  fork({
    values: [
      [callModel.$callRole, "tutor"],
      [
        callPresenceModel.$peerPresence,
        { presence: "background", audioSuspended: true, videoSuspended: true, ...presence },
      ],
    ],
  });

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

  it("should offer the fullscreen button only on the peer's tile", () => {
    const { unmount } = renderTile(<VideoTile name="Иван" media={media()} variant="remote" />);
    expect(screen.getByRole("button", { name: "Во весь экран" })).toBeInTheDocument();
    unmount();

    renderTile(<VideoTile name="Вы" media={media()} variant="self" />);
    renderTile(<VideoTile name="Вы" media={media()} variant="selfCompact" />);
    expect(screen.queryByRole("button", { name: "Во весь экран" })).not.toBeInTheDocument();
  });

  it("should leave the name, the badges and the screen label to the fullscreen controls", () => {
    renderTile(
      <VideoTile
        name="Иван Смирнов"
        media={media({ micOn: false, screenSharing: true })}
        variant="fullscreen"
      />
    );

    expect(screen.queryByText("Иван Смирнов")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Микрофон выключен")).not.toBeInTheDocument();
    expect(screen.queryByText("Демонстрация экрана")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Во весь экран" })).not.toBeInTheDocument();
  });

  it("should fill the whole window with the peer's camera in the fullscreen tile", () => {
    const { container } = renderTile(
      <VideoTile name="Иван" media={media()} variant="fullscreen" stream={new MediaStream()} />
    );

    expect(container.querySelector("video")).toHaveAttribute("data-layout", "overlay");
  });

  it("should show the avatar placeholder in the fullscreen tile with the camera off", () => {
    renderTile(<VideoTile name="Иван" media={media({ cameraOn: false })} variant="fullscreen" />);

    expect(screen.getByText("Камера выключена")).toBeInTheDocument();
    expect(screen.queryByTestId("PersonIcon")).not.toBeInTheDocument();
  });

  it("should show the peer's interruption instead of the camera label", () => {
    renderInScope(
      minimizedStudent(),
      <VideoTile name="Иван" media={media({ cameraOn: false })} variant="remote" />
    );

    expect(screen.getByText("Ученик свернул приложение")).toBeInTheDocument();
    expect(screen.queryByText("Камера выключена")).not.toBeInTheDocument();
  });

  it("should keep the peer's interruption and audio notice out of the own tile", () => {
    renderInScope(
      minimizedStudent(),
      <VideoTile name="Вы" media={media({ cameraOn: false, micOn: false })} variant="self" />
    );

    expect(screen.getByText("Камера выключена")).toBeInTheDocument();
    expect(screen.getByLabelText("Микрофон выключен")).toBeInTheDocument();
    expect(screen.queryByText(/свернул приложение/)).not.toBeInTheDocument();
  });

  it("should replace the muted-mic badge of the peer with the suspended-mic notice", () => {
    renderInScope(
      minimizedStudent({ videoSuspended: false }),
      <VideoTile name="Иван" media={media({ micOn: false })} variant="remote" />
    );

    expect(
      screen.getByText("Микрофон ученика приостановлен — ученик свернул приложение")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Микрофон выключен")).not.toBeInTheDocument();
  });
});
