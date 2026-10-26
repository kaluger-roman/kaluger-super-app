import type { FC } from "react";

import { useUnit } from "effector-react";

import { FullscreenBottomBar } from "./FullscreenBottomBar";
import { useControlsFocus } from "./FullscreenControls.hooks";
import * as Styled from "./FullscreenControls.styled";
import { FullscreenTopBar } from "./FullscreenTopBar";
import { callFullscreenModel, callModel } from "../../model";
import { CALL_CONTROLS_ATTR, CONNECTING_TEXT } from "../../videoCall.constants";
import { CallStatusBanner } from "../CallStatusBanner";

// The layer itself lets pointers through to the video; only the bars catch them.
export const FullscreenControls: FC = () => {
  const visible = useUnit(callFullscreenModel.$controlsVisible);
  const isConnecting = useUnit(callModel.$isConnecting);
  const focusHandlers = useControlsFocus();

  return (
    <Styled.Layer
      data-testid="fullscreen-controls"
      data-visible={visible}
      {...{ [CALL_CONTROLS_ATTR]: true }}
      {...focusHandlers}
    >
      <FullscreenTopBar />
      {isConnecting && (
        <Styled.BannerSlot>
          <CallStatusBanner text={CONNECTING_TEXT} />
        </Styled.BannerSlot>
      )}
      <FullscreenBottomBar />
    </Styled.Layer>
  );
};
