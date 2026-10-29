import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import { useUnit } from "effector-react";

import { ZOOM_SCALE_VAR, ZOOM_X_VAR, ZOOM_Y_VAR } from "./VideoTile.constants";
import {
  getPointerDistance,
  getPointerMidpoint,
  getStageGeometry,
  getVideoLayoutRect,
  enablePeerPictureInPicture,
  getWheelZoomFactor,
  readGesture,
  resumePlayback,
  toCenterOffset,
} from "./VideoTile.helpers";
import type { GesturePoint, MediaPlayback } from "./VideoTile.types";
import { callZoomModel } from "../../model";

// Keeps a call video attached to its stream and playing: iOS Safari pauses it in the background.
export const useCallVideoPlayback = (
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null
): MediaPlayback => {
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

export const useZoomTransform = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): void => {
  const zoom = useUnit(callZoomModel.$zoom);

  useLayoutEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (!enabled) {
      element.style.removeProperty(ZOOM_SCALE_VAR);
      element.style.removeProperty(ZOOM_X_VAR);
      element.style.removeProperty(ZOOM_Y_VAR);
      return;
    }
    element.style.setProperty(ZOOM_SCALE_VAR, String(zoom.scale));
    element.style.setProperty(ZOOM_X_VAR, `${zoom.offsetX}px`);
    element.style.setProperty(ZOOM_Y_VAR, `${zoom.offsetY}px`);
  }, [videoRef, enabled, zoom]);
};

// Wheel and pinch zoom around the pointer, one pointer pans. The wheel listener is native and
// non-passive: React's is passive, and a ctrl + wheel (trackpad pinch) would zoom the whole page.
// Desktop Safari reports a trackpad pinch only as gesture events; iOS sends them next to the
// touch pointers, which already zoom.
export const useZoomGestures = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): void => {
  const { zoomedAt, panned } = useUnit({
    zoomedAt: callZoomModel.zoomedAt,
    panned: callZoomModel.panned,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    const pointers = new Map<number, GesturePoint>();
    let gestureScale = 1;

    const zoomAround = (factor: number, point: GesturePoint) => {
      const box = getVideoLayoutRect(video);
      if (!box) return;
      const focus = toCenterOffset(point, box);
      zoomedAt({ factor, focusX: focus.x, focusY: focus.y });
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAround(getWheelZoomFactor(event, video.clientHeight), {
        x: event.clientX,
        y: event.clientY,
      });
    };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureScale = 1;
    };

    const handleGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = readGesture(event);
      if (!gesture || gesture.scale <= 0 || pointers.size > 0) return;
      zoomAround(gesture.scale / gestureScale, gesture.point);
      gestureScale = gesture.scale;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      video.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const current = { x: event.clientX, y: event.clientY };
      const other = Array.from(pointers).find(([id]) => id !== event.pointerId)?.[1];
      pointers.set(event.pointerId, current);
      if (!other) {
        panned({ dx: current.x - previous.x, dy: current.y - previous.y });
        return;
      }
      const before = getPointerMidpoint(previous, other);
      const after = getPointerMidpoint(current, other);
      const distance = getPointerDistance(previous, other);
      if (distance > 0) zoomAround(getPointerDistance(current, other) / distance, before);
      panned({ dx: after.x - before.x, dy: after.y - before.y });
    };

    const handlePointerEnd = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
    };

    video.addEventListener("wheel", handleWheel, { passive: false });
    video.addEventListener("gesturestart", handleGestureStart);
    video.addEventListener("gesturechange", handleGestureChange);
    video.addEventListener("pointerdown", handlePointerDown);
    video.addEventListener("pointermove", handlePointerMove);
    video.addEventListener("pointerup", handlePointerEnd);
    video.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      video.removeEventListener("wheel", handleWheel);
      video.removeEventListener("gesturestart", handleGestureStart);
      video.removeEventListener("gesturechange", handleGestureChange);
      video.removeEventListener("pointerdown", handlePointerDown);
      video.removeEventListener("pointermove", handlePointerMove);
      video.removeEventListener("pointerup", handlePointerEnd);
      video.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [videoRef, enabled, zoomedAt, panned]);
};

// The box changes with the window, the picture size when the peer shares another window.
export const useStageGeometry = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): void => {
  const { geometryChanged } = useUnit({ geometryChanged: callZoomModel.stageGeometryChanged });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    const report = () => geometryChanged(getStageGeometry(video));
    const observer = new ResizeObserver(report);

    observer.observe(video);
    video.addEventListener("loadedmetadata", report);
    video.addEventListener("resize", report);
    report();
    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", report);
      video.removeEventListener("resize", report);
      geometryChanged(null);
    };
  }, [videoRef, enabled, geometryChanged]);
};

export const usePeerPictureInPicture = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): void => {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    return enablePeerPictureInPicture(video);
  }, [videoRef, enabled]);
};
