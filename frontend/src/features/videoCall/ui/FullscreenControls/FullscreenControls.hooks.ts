import { useUnit } from "effector-react";

import { isFocusLeaving, isMousePointer } from "./FullscreenControls.helpers";
import type { BarState, FocusHandlers, HoverHandlers } from "./FullscreenControls.types";
import { callFullscreenModel } from "../../model";
import { isKeyboardFocus } from "../../videoCall.helpers";

// Only a mouse hovers: a finger "enters" a bar on every tap and must not hold the controls.
export const useControlsHover = (): HoverHandlers => {
  const actions = useUnit({
    hovered: callFullscreenModel.controlsHovered,
    unhovered: callFullscreenModel.controlsUnhovered,
  });

  return {
    onPointerEnter: (event) => {
      if (isMousePointer(event)) actions.hovered();
    },
    onPointerLeave: (event) => {
      if (isMousePointer(event)) actions.unhovered();
    },
  };
};

export const useControlsFocus = (): FocusHandlers => {
  const actions = useUnit({
    focused: callFullscreenModel.controlsFocused,
    blurred: callFullscreenModel.controlsBlurred,
  });

  return {
    onFocus: (event) => {
      if (isKeyboardFocus(event.target)) actions.focused();
    },
    onBlur: (event) => {
      if (isFocusLeaving(event.currentTarget, event.relatedTarget)) actions.blurred();
    },
  };
};

export const useBarState = (): BarState => {
  const visible = useUnit(callFullscreenModel.$controlsVisible);
  const interactive = useUnit(callFullscreenModel.$controlsInteractive);
  return { visible, interactive };
};
