import { ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { callFullscreenModel, callModel } from "../../../model";
import {
  CONTROLS_AUTO_HIDE_MS,
  CONTROLS_REVEAL_GUARD_MS,
} from "../../../model/callFullscreen.constants";
import { formatCallDuration } from "../../../videoCall.helpers";
import type { CallMediaState } from "../../../videoCall.types";
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
