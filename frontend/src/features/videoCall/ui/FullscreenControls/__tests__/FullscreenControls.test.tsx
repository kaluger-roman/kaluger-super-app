import { ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { callFullscreenModel, callModel, callPresenceModel, callResumeModel } from "../../../model";
import {
  CONTROLS_AUTO_HIDE_MS,
  CONTROLS_REVEAL_GUARD_MS,
} from "../../../model/callFullscreen.constants";
import type { CallRole } from "../../../model/signaling.types";
import { formatCallDuration } from "../../../videoCall.helpers";
import type { CallMediaState, PeerPresenceState } from "../../../videoCall.types";
import { FullscreenControls } from "../FullscreenControls";

const PEER_NAME = "Иван Смирнов";

const peerMedia = (overrides: Partial<CallMediaState> = {}): CallMediaState => ({
  micOn: true,
  cameraOn: true,
  screenSharing: false,
  cameraAvailable: true,
  ...overrides,
});

const createScope = (media: CallMediaState = peerMedia(), controlsVisible = true) =>
  fork({
    values: [
      [callModel.$callPhase, "active"],
      [callModel.$outgoingCallPeer, { name: PEER_NAME, role: "student" }],
      [callModel.$callDurationSeconds, 65],
      [callModel.$peerMediaState, media],
      [callFullscreenModel.$isFullscreen, true],
      [callFullscreenModel.$controlsVisible, controlsVisible],
    ],
  });

const MINIMIZED: PeerPresenceState = {
  presence: "background",
  audioSuspended: true,
  videoSuspended: true,
};

const createPresenceScope = (
  role: CallRole,
  presence: PeerPresenceState,
  media: CallMediaState = peerMedia(),
  controlsVisible = true
) =>
  fork({
    values: [
      [callModel.$callPhase, "active"],
      [callModel.$callRole, role],
      [callModel.$outgoingCallPeer, { name: PEER_NAME, role: "student" }],
      [callModel.$peerMediaState, media],
      [callPresenceModel.$peerPresence, presence],
      [callFullscreenModel.$isFullscreen, true],
      [callFullscreenModel.$controlsVisible, controlsVisible],
    ],
  });

const renderControls = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <FullscreenControls />
        <button type="button">Снаружи</button>
      </ThemeProvider>
    </EffectorProvider>
  );

const getBar = (bar: "top" | "bottom") => {
  const element = screen.getByTestId("fullscreen-controls").querySelector(`[data-bar="${bar}"]`);
  if (!element) throw new Error(`no ${bar} bar`);
  return element;
};

const getBars = () => ({ topBar: getBar("top"), bottomBar: getBar("bottom") });

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("FullscreenControls", () => {
  it("should show the peer, the call time and «Свернуть» on top and the call buttons below", () => {
    renderControls(createScope());

    expect(screen.getByText(PEER_NAME)).toBeInTheDocument();
    expect(screen.getByText(formatCallDuration(65))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Свернуть" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Завершить звонок" })).toBeInTheDocument();
    expect(screen.queryByText("Демонстрация экрана")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Микрофон выключен")).not.toBeInTheDocument();
  });

  it("should mark the peer's screen share and muted mic", () => {
    renderControls(createScope(peerMedia({ screenSharing: true, micOn: false })));

    expect(screen.getByText("Демонстрация экрана")).toBeInTheDocument();
    expect(screen.getByLabelText("Микрофон выключен")).toBeInTheDocument();
  });

  it("should not mark the screen share of an interrupted peer or offer its zoom (regression)", () => {
    renderControls(
      fork({
        values: [
          [callModel.$callPhase, "active"],
          [callModel.$outgoingCallPeer, { name: PEER_NAME, role: "student" }],
          [callModel.$peerMediaState, peerMedia({ screenSharing: true })],
          [callPresenceModel.$mediaConnectionLost, true],
          [callFullscreenModel.$isFullscreen, true],
          [callFullscreenModel.$controlsVisible, true],
        ],
      })
    );

    expect(screen.queryByText("Демонстрация экрана")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Масштаб демонстрации" })).not.toBeInTheDocument();
  });

  it("should tell the tutor that the student's mic is suspended instead of the muted-mic badge (regression)", () => {
    renderControls(createPresenceScope("tutor", MINIMIZED, peerMedia({ micOn: false })));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Микрофон ученика приостановлен — ученик свернул приложение"
    );
    expect(screen.queryByLabelText("Микрофон выключен")).not.toBeInTheDocument();
  });

  it("should tell the student only that the sound is unavailable (FR-032)", () => {
    renderControls(createPresenceScope("student", MINIMIZED));

    expect(screen.getByRole("status")).toHaveTextContent("Звук временно недоступен");
    expect(screen.queryByText(/свернул приложение/)).not.toBeInTheDocument();
  });

  it("should keep the audio notice shown while the bars are hidden", () => {
    renderControls(createPresenceScope("tutor", MINIMIZED, peerMedia(), false));

    const notice = screen.getByRole("status");
    expect(getBar("top")).toHaveAttribute("data-visible", "false");
    expect(getBar("top")).not.toContainElement(notice);
  });

  it("should offer the zoom only for the peer's screen", () => {
    const { unmount } = renderControls(createScope(peerMedia({ screenSharing: true })));
    expect(screen.getByRole("group", { name: "Масштаб демонстрации" })).toBeInTheDocument();
    unmount();

    renderControls(createScope());
    expect(screen.queryByRole("group", { name: "Масштаб демонстрации" })).not.toBeInTheDocument();
  });

  it("should reflect whether the controls are shown", () => {
    const { unmount } = renderControls(createScope(peerMedia(), true));
    expect(screen.getByTestId("fullscreen-controls")).toHaveAttribute("data-visible", "true");
    unmount();

    renderControls(createScope(peerMedia(), false));
    expect(screen.getByTestId("fullscreen-controls")).toHaveAttribute("data-visible", "false");
  });

  it.each(["topBar", "bottomBar"] as const)(
    "should hold the controls while the mouse is over the %s",
    (bar) => {
      const scope = createScope();
      renderControls(scope);

      fireEvent.pointerEnter(getBars()[bar], { pointerType: "mouse" });
      expect(scope.getState(callFullscreenModel.$isControlsHovered)).toBe(true);

      fireEvent.pointerLeave(getBars()[bar], { pointerType: "mouse" });
      expect(scope.getState(callFullscreenModel.$isControlsHovered)).toBe(false);
    }
  );

  it("should not take a finger on a bar for hovering", () => {
    const scope = createScope();
    renderControls(scope);

    fireEvent.pointerEnter(getBars().bottomBar, { pointerType: "touch" });

    expect(scope.getState(callFullscreenModel.$isControlsHovered)).toBe(false);
  });

  it("should keep keyboard-focused controls past the idle timeout and hide them once focus leaves", async () => {
    vi.useFakeTimers();
    const scope = createScope();
    renderControls(scope);

    act(() => screen.getByRole("button", { name: "Свернуть" }).focus());
    await advance(CONTROLS_AUTO_HIDE_MS * 2);
    expect(scope.getState(callFullscreenModel.$controlsVisible)).toBe(true);

    act(() => screen.getByRole("button", { name: "Завершить звонок" }).focus());
    await advance(CONTROLS_AUTO_HIDE_MS * 2);
    expect(scope.getState(callFullscreenModel.$controlsVisible)).toBe(true);

    act(() => screen.getByRole("button", { name: "Снаружи" }).focus());
    await advance(CONTROLS_AUTO_HIDE_MS);
    expect(scope.getState(callFullscreenModel.$controlsVisible)).toBe(false);
  });

  it("should not hold the controls with a focus a mouse click put inside", async () => {
    vi.useFakeTimers();
    const scope = createScope();
    renderControls(scope);
    const hangUp = screen.getByRole("button", { name: "Завершить звонок" });
    const matches = hangUp.matches.bind(hangUp);
    vi.spyOn(hangUp, "matches").mockImplementation((selector) =>
      selector === ":focus-visible" ? false : matches(selector)
    );

    await act(async () => {
      void allSettled(callFullscreenModel.activityDetected, { scope });
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => hangUp.focus());
    await advance(CONTROLS_AUTO_HIDE_MS);

    expect(scope.getState(callFullscreenModel.$controlsVisible)).toBe(false);
  });

  it("should keep the connection banner shown while the bars are hidden", () => {
    const scope = fork({
      values: [
        [callModel.$callPhase, "connecting"],
        [callFullscreenModel.$isFullscreen, true],
        [callFullscreenModel.$controlsVisible, false],
      ],
    });
    renderControls(scope);

    expect(screen.getByRole("status")).toHaveTextContent("Соединение…");
    expect(getBar("top")).toHaveAttribute("data-visible", "false");
  });

  it("should tell in fullscreen that the own connection is being restored (regression)", () => {
    const scope = fork({
      values: [
        [callModel.$callPhase, "active"],
        [callResumeModel.$isOwnTransportLost, true],
        [callFullscreenModel.$isFullscreen, true],
        [callFullscreenModel.$controlsVisible, false],
      ],
    });
    renderControls(scope);

    expect(screen.getByRole("status")).toHaveTextContent("Восстанавливаем связь…");
  });

  it("should let touches through bars a tap revealed until the reveal guard passes", async () => {
    vi.useFakeTimers();
    const scope = createScope(peerMedia(), false);
    renderControls(scope);

    await act(async () => {
      void allSettled(callFullscreenModel.hiddenControlsTapped, { scope });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(getBar("bottom")).toHaveAttribute("data-visible", "true");
    expect(getBar("bottom")).toHaveAttribute("data-interactive", "false");

    await advance(CONTROLS_REVEAL_GUARD_MS);
    expect(getBar("bottom")).toHaveAttribute("data-interactive", "true");
  });

  it("should show the full peer name on hover, as the tile's name pill did", async () => {
    renderControls(createScope());

    fireEvent.mouseOver(screen.getByText(PEER_NAME));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(PEER_NAME);
  });
});
