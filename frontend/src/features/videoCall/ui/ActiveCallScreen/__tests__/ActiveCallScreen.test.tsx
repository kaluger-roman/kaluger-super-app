import { ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { callFullscreenModel, callModel } from "../../../model";
import type { CallPhase } from "../../../model/call.types";
import { ActiveCallScreen } from "../ActiveCallScreen";

const PEER_NAME = "Иван Смирнов";

type ScreenOptions = {
  peerSharing?: boolean;
  selfCameraOn?: boolean;
  phase?: CallPhase;
  fullscreen?: boolean;
  controlsVisible?: boolean;
  remoteStream?: MediaStream | null;
};

const renderScreen = ({
  peerSharing = false,
  selfCameraOn = true,
  phase = "active",
  fullscreen = false,
  controlsVisible = true,
  remoteStream = null,
}: ScreenOptions = {}) => {
  const scope = fork({
    values: [
      [callModel.$callPhase, phase],
      [callModel.$outgoingCallPeer, { name: PEER_NAME, role: "student" }],
      [
        callModel.$peerMediaState,
        { micOn: true, cameraOn: true, screenSharing: peerSharing, cameraAvailable: true },
      ],
      [
        callModel.$selfMediaState,
        { micOn: true, cameraOn: selfCameraOn, screenSharing: false, cameraAvailable: true },
      ],
      [callModel.$remoteStream, remoteStream],
      [callFullscreenModel.$isFullscreen, fullscreen],
      [callFullscreenModel.$controlsVisible, controlsVisible],
    ],
  });
  const { container, unmount } = render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <ActiveCallScreen />
        <div role="dialog">
          <button type="button">Диалог</button>
        </div>
      </ThemeProvider>
    </EffectorProvider>
  );
  const getRoot = () => container.querySelector("[data-fullscreen]");
  return { scope, getRoot, unmount };
};

const isFullscreen = (scope: ReturnType<typeof renderScreen>["scope"]) =>
  scope.getState(callFullscreenModel.$isFullscreen);

const tap = (target: Element, pointerId = 1, x = 200) => {
  const init = { pointerType: "touch", pointerId, clientX: x, clientY: 200 };
  fireEvent.pointerDown(target, init);
  fireEvent.pointerUp(target, init);
};

describe("ActiveCallScreen", () => {
  it("should shrink the own tile while the peer shares a screen", () => {
    renderScreen({ peerSharing: true });
    expect(screen.getByTestId("local-pip")).toHaveAttribute("data-compact", "true");
  });

  it("should keep the regular own tile otherwise", () => {
    renderScreen();
    expect(screen.getByTestId("local-pip")).toHaveAttribute("data-compact", "false");
  });

  it("should show the connecting banner until media connects", () => {
    renderScreen({ phase: "connecting" });
    expect(screen.getByRole("status")).toHaveTextContent("Соединение…");
  });

  it("should not show the connecting banner once connected", () => {
    renderScreen();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should drop the camera-off label from the compact own tile", () => {
    renderScreen({ peerSharing: true, selfCameraOn: false });
    expect(screen.queryByText("Камера выключена")).not.toBeInTheDocument();
  });

  it("should keep the camera-off label in the regular own tile", () => {
    renderScreen({ selfCameraOn: false });
    expect(screen.getByText("Камера выключена")).toBeInTheDocument();
  });

  it("should offer the fullscreen button in the regular view", () => {
    const { getRoot } = renderScreen();

    expect(screen.getByRole("button", { name: "Во весь экран" })).toBeInTheDocument();
    expect(screen.getAllByText(PEER_NAME)).toHaveLength(2);
    expect(screen.getByTestId("local-pip")).toBeInTheDocument();
    expect(getRoot()).toHaveAttribute("data-fullscreen", "false");
  });

  it("should give the whole window to the peer in the mode", async () => {
    const { getRoot } = renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Во весь экран" }));

    expect(getRoot()).toHaveAttribute("data-fullscreen", "true");
    expect(screen.queryByTestId("local-pip")).not.toBeInTheDocument();
    expect(screen.getAllByText(PEER_NAME)).toHaveLength(1);
    expect(screen.getByTestId("fullscreen-controls")).toContainElement(screen.getByText(PEER_NAME));
    expect(screen.getByRole("button", { name: "Свернуть" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Во весь экран" })).not.toBeInTheDocument();
  });

  it("should keep the peer's video element across the mode switch (regression: no remount)", async () => {
    renderScreen({ remoteStream: new MediaStream() });
    const video = screen.getByTestId("remote-stage").querySelector("video");
    expect(video).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Во весь экран" }));
    expect(screen.getByTestId("remote-stage").querySelector("video")).toBe(video);

    await userEvent.click(screen.getByRole("button", { name: "Свернуть" }));
    expect(screen.getByTestId("remote-stage").querySelector("video")).toBe(video);
  });

  it("should leave the mode on Escape", async () => {
    const { scope } = renderScreen({ fullscreen: true });

    await userEvent.keyboard("{Escape}");

    expect(isFullscreen(scope)).toBe(false);
  });

  it("should take Escape from a dialog left open under the call screen (regression)", async () => {
    const { scope } = renderScreen({ fullscreen: true });
    const dialog = screen.getByRole("dialog");
    const dialogKeyDown = vi.fn();
    dialog.addEventListener("keydown", dialogKeyDown);
    act(() => screen.getByRole("button", { name: "Диалог" }).focus());

    await userEvent.keyboard("{Escape}");

    expect(isFullscreen(scope)).toBe(false);
    expect(dialogKeyDown).not.toHaveBeenCalled();
  });

  it("should do nothing on Escape in the regular view", async () => {
    const { scope, getRoot } = renderScreen();

    await userEvent.keyboard("{Escape}");

    expect(isFullscreen(scope)).toBe(false);
    expect(getRoot()).toHaveAttribute("data-fullscreen", "false");
  });

  it("should switch the mode on a double click on the video", async () => {
    const { scope } = renderScreen();

    await userEvent.dblClick(screen.getByTestId("remote-stage"));
    expect(isFullscreen(scope)).toBe(true);

    await userEvent.dblClick(screen.getByTestId("remote-stage"));
    expect(isFullscreen(scope)).toBe(false);
  });

  it("should not switch back when the second press of a double click on the button hits the video", () => {
    const { scope } = renderScreen();
    const button = screen.getByRole("button", { name: "Во весь экран" });

    fireEvent.pointerDown(button, { pointerType: "mouse" });
    fireEvent.click(button);
    fireEvent.pointerDown(screen.getByTestId("remote-stage"), { pointerType: "mouse" });
    fireEvent.doubleClick(screen.getByTestId("remote-stage"));

    expect(isFullscreen(scope)).toBe(true);
  });

  it("should switch the mode on a double tap and not on a single one", () => {
    const { scope } = renderScreen();
    const stage = screen.getByTestId("remote-stage");

    tap(stage);
    expect(isFullscreen(scope)).toBe(false);

    tap(stage);
    expect(isFullscreen(scope)).toBe(true);

    tap(stage);
    tap(stage);
    expect(isFullscreen(scope)).toBe(false);
  });

  it("should not take a two-finger touch for a double tap", () => {
    const { scope } = renderScreen();
    const stage = screen.getByTestId("remote-stage");

    for (let round = 0; round < 2; round += 1) {
      fireEvent.pointerDown(stage, { pointerType: "touch", pointerId: 1, clientX: 100 });
      fireEvent.pointerDown(stage, { pointerType: "touch", pointerId: 2, clientX: 110 });
      fireEvent.pointerUp(stage, { pointerType: "touch", pointerId: 1, clientX: 100 });
      fireEvent.pointerUp(stage, { pointerType: "touch", pointerId: 2, clientX: 110 });
    }

    expect(isFullscreen(scope)).toBe(false);
  });

  it("should ignore the double click a phone synthesizes after a double tap", () => {
    const { scope } = renderScreen();
    const stage = screen.getByTestId("remote-stage");

    tap(stage);
    tap(stage);
    fireEvent.doubleClick(stage);

    expect(isFullscreen(scope)).toBe(true);
  });

  it("should keep the connecting banner in the mode", () => {
    renderScreen({ phase: "connecting", fullscreen: true });

    expect(screen.getByRole("status")).toHaveTextContent("Соединение…");
  });

  it("should hide the cursor while the controls are hidden", () => {
    const { getRoot } = renderScreen({ fullscreen: true, controlsVisible: false });

    expect(getRoot()).toHaveAttribute("data-cursor-hidden", "true");
  });

  it("should bring the controls back on a mouse move but not on a finger move", () => {
    const { getRoot } = renderScreen({ fullscreen: true, controlsVisible: false });
    const root = getRoot() as Element;

    fireEvent.pointerMove(root, { pointerType: "touch" });
    expect(screen.getByTestId("fullscreen-controls")).toHaveAttribute("data-visible", "false");

    fireEvent.pointerMove(root, { pointerType: "mouse" });
    expect(screen.getByTestId("fullscreen-controls")).toHaveAttribute("data-visible", "true");
    expect(root).toHaveAttribute("data-cursor-hidden", "false");
  });

  it("should bring the controls back on a tap", () => {
    const { scope, getRoot } = renderScreen({ fullscreen: true, controlsVisible: false });

    fireEvent.pointerDown(getRoot() as Element, { pointerType: "touch" });
    expect(scope.getState(callFullscreenModel.$controlsVisible)).toBe(true);
  });

  it("should bring the controls back on a key press inside the call screen", () => {
    const { scope } = renderScreen({ fullscreen: true, controlsVisible: false });

    fireEvent.keyDown(screen.getByTestId("remote-stage"), { key: "Shift" });

    expect(scope.getState(callFullscreenModel.$controlsVisible)).toBe(true);
  });

  it("should bring the controls back on a wheel turn", () => {
    const { scope } = renderScreen({ fullscreen: true, controlsVisible: false });

    fireEvent.wheel(screen.getByTestId("remote-stage"), { deltaY: -100 });

    expect(scope.getState(callFullscreenModel.$controlsVisible)).toBe(true);
  });

  it("should keep the page from zooming in the mode, and only then", () => {
    const { unmount } = renderScreen({ fullscreen: true });
    const bar = screen.getByRole("button", { name: "Свернуть" });

    // happy-dom's WheelEvent has no ctrlKey, so the wheel is built by hand.
    const wheel = (ctrlKey: boolean) =>
      bar.dispatchEvent(
        Object.assign(new Event("wheel", { bubbles: true, cancelable: true }), { ctrlKey })
      );

    expect(wheel(true)).toBe(false);
    expect(wheel(false)).toBe(true);
    expect(bar.dispatchEvent(new Event("gesturechange", { bubbles: true, cancelable: true }))).toBe(
      false
    );
    unmount();

    renderScreen();
    expect(
      document.body.dispatchEvent(new Event("gesturechange", { bubbles: true, cancelable: true }))
    ).toBe(true);
  });

  it.each([
    ["touch", false],
    ["mouse", true],
  ])("should let controls revealed by a %s press take presses: %s", (pointerType, interactive) => {
    const { scope, getRoot } = renderScreen({ fullscreen: true, controlsVisible: false });

    fireEvent.pointerDown(getRoot() as Element, { pointerType });

    expect(scope.getState(callFullscreenModel.$controlsInteractive)).toBe(interactive);
  });

  it("should hold off the regular call buttons after a double-tap exit", () => {
    const { scope } = renderScreen({ fullscreen: true });

    tap(screen.getByTestId("remote-stage"));
    tap(screen.getByTestId("remote-stage"));

    expect(isFullscreen(scope)).toBe(false);
    expect(screen.getByTestId("call-controls")).toHaveAttribute("data-interactive", "false");
  });

  it("should keep the regular call buttons pressable after an Escape exit", async () => {
    const { scope } = renderScreen({ fullscreen: true });

    await userEvent.keyboard("{Escape}");

    expect(isFullscreen(scope)).toBe(false);
    expect(screen.getByTestId("call-controls")).toHaveAttribute("data-interactive", "true");
  });
});
