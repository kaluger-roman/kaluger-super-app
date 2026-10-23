import { ThemeProvider } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

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

  it("should not offer picture-in-picture", () => {
    const { container } = renderVideo(fakeStream());

    expect(container.querySelector("video")).toHaveAttribute("disablepictureinpicture");
  });
});
