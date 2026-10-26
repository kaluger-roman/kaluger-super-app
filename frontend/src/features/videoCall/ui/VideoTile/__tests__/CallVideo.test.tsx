import { ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import type { EventCallable, Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { callFullscreenModel, callModel, callZoomModel } from "../../../model";
import { ZOOM_RESET } from "../../../model/callFullscreen.constants";
import { CallVideo } from "../CallVideo";
import { resumePlayback } from "../VideoTile.helpers";

const fakeStream = () => ({ id: "stream" }) as unknown as MediaStream;
const RESUME_LABEL = /Видео на паузе/;

let paused = true;
let play: ReturnType<typeof vi.fn>;
// jsdom only takes a real MediaStream as srcObject; the tests keep whatever they set.
const srcObjectDescriptor = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  "srcObject"
);
const attached = new WeakMap<HTMLMediaElement, MediaProvider | null>();

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  paused = true;
  play = vi.fn(async () => {
    paused = false;
  });
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(() => paused);
  HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement["play"];
  Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return attached.get(this) ?? null;
    },
    set(this: HTMLMediaElement, value: MediaProvider | null) {
      attached.set(this, value);
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (srcObjectDescriptor) {
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", srcObjectDescriptor);
  }
});

const renderVideo = (stream: MediaStream | null) =>
  render(
    <ThemeProvider theme={theme}>
      <CallVideo stream={stream} muted hidden={false} fit="cover" layout="overlay" />
    </ThemeProvider>
  );

const blockNextPlay = () =>
  play.mockImplementationOnce(async () => {
    throw new DOMException("gesture", "NotAllowedError");
  });

describe("resumePlayback", () => {
  it("should play a paused video that has a stream", () => {
    const element = document.createElement("video");
    element.srcObject = fakeStream();

    resumePlayback(element, vi.fn());

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("should leave a playing video or one without a stream alone", () => {
    const element = document.createElement("video");
    resumePlayback(element, vi.fn());
    element.srcObject = fakeStream();
    paused = false;
    resumePlayback(element, vi.fn());

    expect(play).not.toHaveBeenCalled();
  });

  it("should report a play that needs a gesture, but not one a newer stream aborted", async () => {
    const element = document.createElement("video");
    element.srcObject = fakeStream();
    const onBlocked = vi.fn();

    blockNextPlay();
    resumePlayback(element, onBlocked);
    await flush();
    expect(onBlocked).toHaveBeenLastCalledWith(true);

    onBlocked.mockClear();
    play.mockImplementationOnce(async () => {
      throw new DOMException("replaced", "AbortError");
    });
    resumePlayback(element, onBlocked);
    await flush();
    expect(onBlocked).not.toHaveBeenCalled();
  });
});

describe("CallVideo playback (regression: iOS Safari pause button over a frozen call video)", () => {
  it("should start playing as soon as the stream is attached", () => {
    renderVideo(fakeStream());

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("should resume when the browser pauses the video", () => {
    const { container } = renderVideo(fakeStream());
    const video = container.querySelector("video") as HTMLVideoElement;
    play.mockClear();
    paused = true;

    fireEvent.pause(video);

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("should resume when the user comes back to the tab", () => {
    renderVideo(fakeStream());
    play.mockClear();
    paused = true;

    document.dispatchEvent(new Event("visibilitychange"));

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("should ask for a tap when the browser refuses to resume, and resume on it", async () => {
    blockNextPlay();
    renderVideo(fakeStream());
    await flush();

    const overlay = await screen.findByRole("button", { name: RESUME_LABEL });
    fireEvent.click(overlay);
    await flush();

    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: RESUME_LABEL })).not.toBeInTheDocument();
  });

  it("should keep a press on the resume button from reaching the call screen", async () => {
    const onPointerDown = vi.fn();
    const onDoubleClick = vi.fn();
    blockNextPlay();
    render(
      <ThemeProvider theme={theme}>
        <div onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
          <CallVideo stream={fakeStream()} muted hidden={false} fit="cover" layout="overlay" />
        </div>
      </ThemeProvider>
    );
    await flush();
    const overlay = await screen.findByRole("button", { name: RESUME_LABEL });

    fireEvent.pointerDown(overlay, { pointerType: "touch" });
    fireEvent.doubleClick(overlay);
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onDoubleClick).not.toHaveBeenCalled();

    fireEvent.click(overlay);
    await flush();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("should not offer picture-in-picture", () => {
    const { container } = renderVideo(fakeStream());

    expect(container.querySelector("video")).toHaveAttribute("disablepictureinpicture");
  });
});

const SHARED_SCREEN = { micOn: true, cameraOn: true, screenSharing: true, cameraAvailable: true };

describe("CallVideo zoom", () => {
  let resizeCallback: (() => void) | null = null;
  const disconnect = vi.fn();
  const restoreProperties: (() => void)[] = [];

  const stubProperty = (target: object, name: string, value: unknown) => {
    const original = Object.getOwnPropertyDescriptor(target, name);
    Object.defineProperty(target, name, { configurable: true, writable: true, value });
    restoreProperties.push(() => {
      if (original) Object.defineProperty(target, name, original);
      else Reflect.deleteProperty(target, name);
    });
  };

  const stubSize = (box: [number, number], picture: [number, number]) => {
    stubProperty(HTMLElement.prototype, "clientWidth", box[0]);
    stubProperty(HTMLElement.prototype, "clientHeight", box[1]);
    stubProperty(HTMLVideoElement.prototype, "videoWidth", picture[0]);
    stubProperty(HTMLVideoElement.prototype, "videoHeight", picture[1]);
  };

  beforeEach(() => {
    resizeCallback = null;
    disconnect.mockReset();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resizeCallback = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      }
    );
    stubProperty(Element.prototype, "setPointerCapture", vi.fn());
    stubProperty(Element.prototype, "releasePointerCapture", vi.fn());
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 1440, height: 810 })
    );
    stubSize([1440, 810], [1920, 1080]);
  });

  afterEach(() => {
    restoreProperties
      .splice(0)
      .reverse()
      .forEach((restore) => restore());
  });

  const createScope = (fullscreen = true) =>
    fork({
      values: [
        [callFullscreenModel.$isFullscreen, fullscreen],
        [callModel.$peerMediaState, SHARED_SCREEN],
      ],
    });

  const renderZoomable = (scope: Scope) => {
    const utils = render(
      <EffectorProvider value={scope}>
        <ThemeProvider theme={theme}>
          <div>
            <CallVideo stream={fakeStream()} muted hidden={false} fit="contain" layout="overlay" />
          </div>
        </ThemeProvider>
      </EffectorProvider>
    );
    const video = utils.container.querySelector("video") as HTMLVideoElement;
    // happy-dom has no offsetParent; the tile is the video's offset parent in the app.
    Object.defineProperty(video, "offsetParent", {
      configurable: true,
      value: video.parentElement,
    });
    return { ...utils, video };
  };

  // happy-dom's WheelEvent has no ctrlKey / clientX / clientY, so wheels are built by hand.
  const wheelAt = (target: Element, deltaY: number, clientX = 720, clientY = 405) =>
    target.dispatchEvent(
      Object.assign(new Event("wheel", { cancelable: true }), {
        deltaY,
        deltaMode: 0,
        ctrlKey: false,
        clientX,
        clientY,
      })
    );

  const gesture = (type: string, init: { scale: number; clientX: number; clientY: number }) =>
    Object.assign(new Event(type, { cancelable: true }), init);

  const run = (scope: Scope, unit: EventCallable<void>) =>
    act(async () => {
      await allSettled(unit, { scope });
    });

  const zoomOf = (scope: Scope) => scope.getState(callZoomModel.$zoom);

  it("should draw the zoom through CSS variables on the video", async () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);

    await run(scope, callZoomModel.zoomInClicked);
    await run(scope, callZoomModel.zoomInClicked);
    await act(async () => {
      await allSettled(callZoomModel.panned, { scope, params: { dx: 40, dy: -20 } });
    });

    expect(video.style.getPropertyValue("--call-zoom-scale")).toBe("2");
    expect(video.style.getPropertyValue("--call-zoom-x")).toBe("40px");
    expect(video.style.getPropertyValue("--call-zoom-y")).toBe("-20px");
    expect(video).toHaveAttribute("data-zoomed", "true");
  });

  it("should drop the CSS variables once the video is no longer zoomable", async () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);
    await run(scope, callZoomModel.zoomInClicked);
    expect(video.style.getPropertyValue("--call-zoom-scale")).toBe("1.5");

    await run(scope, callFullscreenModel.fullscreenToggled);

    expect(video.style.getPropertyValue("--call-zoom-scale")).toBe("");
    expect(video.style.getPropertyValue("--call-zoom-x")).toBe("");
    expect(video).toHaveAttribute("data-zoomed", "false");
  });

  it("should not touch a video that is not zoomable", () => {
    const scope = fork({ values: [[callZoomModel.$zoom, { scale: 2, offsetX: 5, offsetY: 5 }]] });
    const { video } = renderZoomable(scope);

    expect(video.style.getPropertyValue("--call-zoom-scale")).toBe("");
    expect(video).toHaveAttribute("data-zoomed", "false");
    expect(scope.getState(callZoomModel.$stageGeometry)).toBeNull();
  });

  it("should offer the grab cursor on a zoomed screen only while the cursor is shown", async () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);
    expect(video).toHaveAttribute("data-grabbable", "false");

    await run(scope, callZoomModel.zoomInClicked);
    expect(video).toHaveAttribute("data-grabbable", "true");

    await act(async () => {
      await allSettled(callFullscreenModel.$controlsVisible, { scope, params: false });
    });
    expect(video).toHaveAttribute("data-grabbable", "false");
  });

  it("should zoom in on the wheel and keep the page from zooming", () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);

    const notPrevented = wheelAt(video, -100);

    expect(notPrevented).toBe(false);
    expect(zoomOf(scope)).toEqual({ scale: Math.exp(0.2), offsetX: 0, offsetY: 0 });
  });

  it("should zoom in when two fingers spread", () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);

    fireEvent.pointerDown(video, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 600,
      clientY: 400,
    });
    fireEvent.pointerDown(video, {
      pointerType: "touch",
      pointerId: 2,
      clientX: 800,
      clientY: 400,
    });
    fireEvent.pointerMove(video, {
      pointerType: "touch",
      pointerId: 2,
      clientX: 900,
      clientY: 400,
    });

    expect(zoomOf(scope).scale).toBeCloseTo(1.5);
  });

  it("should move the zoomed screen with one pointer", async () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);
    await run(scope, callZoomModel.zoomInClicked);
    await run(scope, callZoomModel.zoomInClicked);

    fireEvent.pointerDown(video, {
      pointerType: "mouse",
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(video, {
      pointerType: "mouse",
      pointerId: 1,
      clientX: 150,
      clientY: 130,
    });
    fireEvent.pointerUp(video, { pointerType: "mouse", pointerId: 1, clientX: 150, clientY: 130 });
    fireEvent.pointerMove(video, {
      pointerType: "mouse",
      pointerId: 1,
      clientX: 300,
      clientY: 300,
    });

    expect(zoomOf(scope)).toEqual({ scale: 2, offsetX: 50, offsetY: 30 });
  });

  it("should not move the screen at 100%", () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);

    fireEvent.pointerDown(video, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(video, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 300,
      clientY: 200,
    });

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should report the box and the picture size, and again on resize", () => {
    const scope = createScope();
    renderZoomable(scope);
    expect(scope.getState(callZoomModel.$stageGeometry)).toEqual({
      boxWidth: 1440,
      boxHeight: 810,
      videoWidth: 1920,
      videoHeight: 1080,
    });

    stubSize([1000, 700], [1280, 720]);
    act(() => resizeCallback?.());

    expect(scope.getState(callZoomModel.$stageGeometry)).toEqual({
      boxWidth: 1000,
      boxHeight: 700,
      videoWidth: 1280,
      videoHeight: 720,
    });
  });

  it("should zoom around the untransformed centre of a moved screen (regression)", async () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);
    await run(scope, callZoomModel.zoomInClicked);
    await run(scope, callZoomModel.zoomInClicked);
    await act(async () => {
      await allSettled(callZoomModel.panned, { scope, params: { dx: 100, dy: 0 } });
    });
    // The drawn video is scaled and moved; only its tile shows the layout box.
    vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(function (this: Element) {
      return this instanceof HTMLVideoElement
        ? DOMRect.fromRect({ x: -620, y: -405, width: 2880, height: 1620 })
        : DOMRect.fromRect({ x: 0, y: 0, width: 1440, height: 810 });
    });

    wheelAt(video, -100);

    // The pointer is over the layout centre, so the offset only grows with the scale.
    expect(zoomOf(scope).offsetX).toBeCloseTo(100 * Math.exp(0.2), 1);
  });

  it("should zoom on a desktop Safari trackpad pinch around the pointer", () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);

    expect(
      video.dispatchEvent(gesture("gesturestart", { scale: 1, clientX: 720, clientY: 405 }))
    ).toBe(false);
    video.dispatchEvent(gesture("gesturechange", { scale: 1.5, clientX: 720, clientY: 405 }));
    video.dispatchEvent(gesture("gesturechange", { scale: 2, clientX: 720, clientY: 405 }));

    expect(zoomOf(scope).scale).toBeCloseTo(2);
  });

  it("should leave an iOS pinch to the touch pointers, not count it twice", () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);

    fireEvent.pointerDown(video, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 600,
      clientY: 400,
    });
    fireEvent.pointerDown(video, {
      pointerType: "touch",
      pointerId: 2,
      clientX: 800,
      clientY: 400,
    });
    video.dispatchEvent(gesture("gesturestart", { scale: 1, clientX: 700, clientY: 400 }));
    video.dispatchEvent(gesture("gesturechange", { scale: 3, clientX: 700, clientY: 400 }));

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should not zoom a video that is not laid out", () => {
    const scope = createScope();
    const { video } = renderZoomable(scope);
    Object.defineProperty(video, "offsetParent", { configurable: true, value: null });

    wheelAt(video, -100);

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should forget the geometry and stop listening once unmounted", () => {
    const scope = createScope();
    const { video, unmount } = renderZoomable(scope);

    unmount();
    fireEvent.wheel(video, { deltaY: -100 });
    video.dispatchEvent(gesture("gesturechange", { scale: 2, clientX: 720, clientY: 405 }));

    expect(disconnect).toHaveBeenCalled();
    expect(scope.getState(callZoomModel.$stageGeometry)).toBeNull();
    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });
});
