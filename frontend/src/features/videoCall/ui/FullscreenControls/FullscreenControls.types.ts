import type { FocusEvent, PointerEvent } from "react";

export type HoverHandlers = {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
};

export type FocusHandlers = {
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

export type BarState = {
  visible: boolean;
  interactive: boolean;
};
