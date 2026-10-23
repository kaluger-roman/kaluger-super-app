import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

import { resumePlayback } from "./VideoTile.helpers";

// Keeps a call video attached to its stream and playing: iOS Safari pauses it in the background.
// `isBlocked` — the browser refused to resume without a tap, so the tile asks for one.
export const useCallVideoPlayback = (
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null
): { isBlocked: boolean; resume: () => void } => {
  const [isBlocked, setBlocked] = useState(false);

  const resume = useCallback(() => {
    if (videoRef.current) resumePlayback(videoRef.current, setBlocked);
  }, [videoRef]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }
    resume();
  }, [videoRef, stream, resume]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") resume();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [resume]);

  return { isBlocked, resume };
};
