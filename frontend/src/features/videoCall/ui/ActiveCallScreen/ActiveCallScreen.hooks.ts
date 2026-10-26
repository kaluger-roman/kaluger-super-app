import { useEffect, useRef } from "react";

import { useUnit } from "effector-react";

import {
  isDoubleTap,
  isInteractiveTarget,
  isTap,
  isVideoDoubleClick,
  toTapSample,
} from "./ActiveCallScreen.helpers";
import type {
  ActivityHandlers,
  DoubleTapHandlers,
  MouseDownSample,
  PointerStart,
  TapSample,
} from "./ActiveCallScreen.types";
import { callFullscreenModel } from "../../model";

// In the mode Escape belongs to the call screen. A dialog left open under it would otherwise get
// the key first (its focus trap holds the focus, MUI stops the event) and close unseen.
export const useFullscreenEscape = (): void => {
  const isFullscreen = useUnit(callFullscreenModel.$isFullscreen);
  const { escapePressed } = useUnit({ escapePressed: callFullscreenModel.escapePressed });

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      event.stopPropagation();
      escapePressed();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isFullscreen, escapePressed]);
};

// In the mode the page never zooms: a pinch over the bars or over a camera arrives as a ctrl + wheel
// (Chrome, Firefox) or as WebKit gesture events, and the shared screen zooms on its own.
export const usePageZoomGuard = (): void => {
  const isFullscreen = useUnit(callFullscreenModel.$isFullscreen);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const preventPageZoom = (event: Event) => event.preventDefault();
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("gesturestart", preventPageZoom);
    document.addEventListener("gesturechange", preventPageZoom);
    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("gesturestart", preventPageZoom);
      document.removeEventListener("gesturechange", preventPageZoom);
    };
  }, [isFullscreen]);
};

// The mouse moves without pressing, a finger cannot: a touch shows up as pointerdown.
export const useCallActivity = (): ActivityHandlers => {
  const isCursorHidden = useUnit(callFullscreenModel.$isCursorHidden);
  const actions = useUnit({
    activityDetected: callFullscreenModel.activityDetected,
    hiddenControlsTapped: callFullscreenModel.hiddenControlsTapped,
  });

  return {
    onPointerMove: (event) => {
      if (event.pointerType === "mouse") actions.activityDetected();
    },
    onPointerDown: (event) => {
      if (event.pointerType !== "mouse" && isCursorHidden) actions.hiddenControlsTapped();
      else actions.activityDetected();
    },
    onKeyDown: () => actions.activityDetected(),
    onWheel: () => actions.activityDetected(),
  };
};

// iOS Safari does not report a double tap as dblclick, so taps are told apart here; the dblclick
// Android synthesizes after two taps is ignored, or the mode would switch twice.
export const useDoubleTapToggle = (): DoubleTapHandlers => {
  const { toggle, doubleTapToggle } = useUnit({
    toggle: callFullscreenModel.fullscreenToggled,
    doubleTapToggle: callFullscreenModel.doubleTapToggled,
  });
  const pointers = useRef(new Map<number, PointerStart>());
  const lastTap = useRef<TapSample | null>(null);
  const isMultiTouch = useRef(false);
  const lastPointerType = useRef("mouse");
  const mousePresses = useRef<MouseDownSample[]>([]);

  const release = (pointerId: number) => {
    pointers.current.delete(pointerId);
    if (pointers.current.size === 0) isMultiTouch.current = false;
  };

  return {
    onPointerDown: (event) => {
      lastPointerType.current = event.pointerType;
      if (event.pointerType === "mouse") {
        const press = { time: event.timeStamp, interactive: isInteractiveTarget(event.target) };
        mousePresses.current = [...mousePresses.current.slice(-1), press];
        return;
      }
      if (isInteractiveTarget(event.target)) return;
      pointers.current.set(event.pointerId, toTapSample(event));
      if (pointers.current.size > 1) {
        isMultiTouch.current = true;
        lastTap.current = null;
      }
    },
    onPointerUp: (event) => {
      const start = pointers.current.get(event.pointerId);
      const partOfPinch = isMultiTouch.current;
      release(event.pointerId);
      if (!start || partOfPinch) return;
      const end = toTapSample(event);
      if (!isTap(start, end)) {
        lastTap.current = null;
      } else if (isDoubleTap(lastTap.current, end)) {
        lastTap.current = null;
        doubleTapToggle();
      } else {
        lastTap.current = end;
      }
    },
    onPointerCancel: (event) => {
      release(event.pointerId);
      lastTap.current = null;
    },
    onDoubleClick: () => {
      if (lastPointerType.current === "mouse" && isVideoDoubleClick(mousePresses.current)) toggle();
    },
  };
};
