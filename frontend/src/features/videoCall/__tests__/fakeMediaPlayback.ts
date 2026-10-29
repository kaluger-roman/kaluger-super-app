import { vi } from "vitest";

// happy-dom never plays media: `play()` marks the media elements as playing, `setPaused(true)`
// stands for the system pausing them. Spies only, so `vi.restoreAllMocks()` in `afterEach` undoes
// it all.
export const stubMediaPlayback = () => {
  let paused = true;
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(() => paused);
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async () => {
    paused = false;
  });

  return {
    play,
    setPaused: (value: boolean) => {
      paused = value;
    },
    blockNextPlay: (name = "NotAllowedError") =>
      play.mockImplementationOnce(async () => {
        throw new DOMException("refused", name);
      }),
  };
};

export type MediaPlaybackStub = ReturnType<typeof stubMediaPlayback>;
