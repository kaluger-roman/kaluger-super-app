import type { PointerEvent } from "react";

export type TapSample = {
  x: number;
  y: number;
  time: number;
};

export type PointerStart = TapSample;

export type MouseDownSample = {
  time: number;
  interactive: boolean;
};

export type DoubleTapHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
};

export type ActivityHandlers = {
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: () => void;
  onWheel: () => void;
};
