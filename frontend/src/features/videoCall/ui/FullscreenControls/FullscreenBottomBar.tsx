import type { FC } from "react";

import { useUnit } from "effector-react";

import { useBarState, useControlsHover } from "./FullscreenControls.hooks";
import * as Styled from "./FullscreenControls.styled";
import { callZoomModel } from "../../model";
import { CallControlBar } from "../CallControlBar";
import { ZoomControls } from "../ZoomControls";

export const FullscreenBottomBar: FC = () => {
  const isZoomAvailable = useUnit(callZoomModel.$isZoomAvailable);
  const hoverHandlers = useControlsHover();
  const { visible, interactive } = useBarState();

  return (
    <Styled.BottomBar
      $visible={visible}
      $interactive={interactive}
      data-bar="bottom"
      data-visible={visible}
      data-interactive={interactive}
      {...hoverHandlers}
    >
      <Styled.ControlsSlot>
        <CallControlBar />
      </Styled.ControlsSlot>
      {isZoomAvailable && (
        <Styled.ZoomSlot>
          <ZoomControls />
        </Styled.ZoomSlot>
      )}
    </Styled.BottomBar>
  );
};
