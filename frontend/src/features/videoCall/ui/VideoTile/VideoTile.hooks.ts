import type { RefObject } from "react";
import { useEffect } from "react";

import { resumePlayback } from "./VideoTile.helpers";

// Keeps a call video attached to its stream and playing: iOS Safari pauses it in the background
// and would leave it frozen behind its own play button.
export const useCallVideoPlayback = (
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null
): void => {
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }
    resumePlayback(element);
  }, [videoRef, stream]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && videoRef.current) {
        resumePlayback(videoRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [videoRef]);
};
