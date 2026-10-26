import { Alert } from "@mui/material";
import { useUnit } from "effector-react";

import { callFullscreenModel, callModel } from "@features/videoCall";

import * as Styled from "./OfflineIndicator.styled";
import { appInitModel } from "../../model";

export const OfflineIndicator = () => {
  const isOnline = useUnit(appInitModel.$isOnline);
  const callPhase = useUnit(callModel.$callPhase);
  const isCallFullscreen = useUnit(callFullscreenModel.$isFullscreen);
  // During a call the bottom edge belongs to the call controls.
  const vertical = callPhase === "idle" ? "bottom" : "top";

  return (
    // In the fullscreen call the top bar with «Свернуть» lies under it: taps go through.
    <Styled.Indicator
      open={!isOnline}
      anchorOrigin={{ vertical, horizontal: "center" }}
      $passThrough={isCallFullscreen}
      data-pass-through={isCallFullscreen}
    >
      <Alert severity="warning" variant="filled">
        Нет подключения к интернету. Данные могут быть неактуальны
      </Alert>
    </Styled.Indicator>
  );
};
