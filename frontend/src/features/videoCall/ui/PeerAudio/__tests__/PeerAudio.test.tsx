import { ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider, useUnit } from "effector-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { stubMediaPlayback } from "../../../__tests__/fakeMediaPlayback";
import type { MediaPlaybackStub } from "../../../__tests__/fakeMediaPlayback";
import { peerAudioModel } from "../../../model";
import { PeerAudio } from "../PeerAudio";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let media: MediaPlaybackStub;

beforeEach(() => {
  media = stubMediaPlayback();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ContinueButton = () => {
  const { clicked } = useUnit({ clicked: peerAudioModel.continueCallClicked });
  return (
    <button type="button" onClick={() => clicked()}>
      Продолжить
    </button>
  );
};

const renderAudio = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <PeerAudio />
        <ContinueButton />
      </ThemeProvider>
    </EffectorProvider>
  );

const withStream = (stream = new MediaStream()) =>
  fork({ values: [[peerAudioModel.$peerAudioStream, stream]] });

const audioElement = () => screen.getByTestId("peer-audio") as HTMLAudioElement;

describe("PeerAudio", () => {
  it("should play the peer's voice as soon as it has a stream", async () => {
    const stream = new MediaStream();
    renderAudio(withStream(stream));
    await act(flush);

    expect(audioElement().srcObject).toBe(stream);
    expect(audioElement()).toHaveAttribute("autoplay");
    expect(media.play).toHaveBeenCalledTimes(1);
  });

  it("should stay silent without a stream", async () => {
    renderAudio(fork());
    await act(flush);

    expect(audioElement().srcObject).toBeNull();
    expect(media.play).not.toHaveBeenCalled();
  });

  it("should follow a new stream in the same element", async () => {
    const scope = withStream();
    renderAudio(scope);
    await act(flush);
    const element = audioElement();
    const rebuilt = new MediaStream();
    media.setPaused(true);

    await act(async () => {
      await allSettled(peerAudioModel.$peerAudioStream, { scope, params: rebuilt });
    });

    expect(audioElement()).toBe(element);
    expect(element.srcObject).toBe(rebuilt);
    expect(media.play).toHaveBeenCalledTimes(2);
  });

  it("should report a sound the browser refuses to start", async () => {
    media.blockNextPlay();
    const scope = withStream();

    renderAudio(scope);
    await act(flush);

    expect(scope.getState(peerAudioModel.$peerAudioBlocked)).toBe(true);
  });

  it("should start the voice inside the tap that resumes the call", async () => {
    media.blockNextPlay();
    const scope = withStream();
    renderAudio(scope);
    await act(flush);
    media.play.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(media.play).toHaveBeenCalledTimes(1);
    expect(media.play.mock.contexts[0]).toBe(audioElement());
    await act(flush);
    expect(scope.getState(peerAudioModel.$peerAudioBlocked)).toBe(false);
  });

  it("should resume the voice the system paused (regression: no resume after a media key pause)", async () => {
    renderAudio(withStream());
    await act(flush);
    media.play.mockClear();
    media.setPaused(true);

    fireEvent.pause(audioElement());

    expect(media.play).toHaveBeenCalledTimes(1);
  });

  it("should no longer be reached by the resume tap once unmounted", async () => {
    const scope = withStream();
    const { unmount } = renderAudio(scope);
    await act(flush);
    unmount();
    media.play.mockClear();
    media.setPaused(true);

    await allSettled(peerAudioModel.continueCallClicked, { scope });

    expect(media.play).not.toHaveBeenCalled();
    expect(scope.getState(peerAudioModel.$peerAudioElement)).toBeNull();
  });
});
