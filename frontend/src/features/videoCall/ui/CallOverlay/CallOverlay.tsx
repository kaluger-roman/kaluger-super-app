import type { FC } from "react";

import { Portal } from "@mui/material";
import { useUnit } from "effector-react";

import { callScreenModel } from "../../model";
import { ActiveCallScreen } from "../ActiveCallScreen";
import { IncomingCallModal } from "../IncomingCallModal";
import { OutgoingCallOverlay } from "../OutgoingCallOverlay";
import * as Styled from "./CallOverlay.styled";

export const CallOverlay: FC = () => {
  const phase = useUnit(callScreenModel.$shownCallPhase);

  if (phase === "incoming") {
    return <IncomingCallModal />;
  }

  if (phase === "idle") {
    return null;
  }

  // A portal, so a transformed ancestor (pull-to-refresh) never becomes the fixed box's frame.
  return (
    <Portal>
      <Styled.FullScreen>
        {phase === "outgoing" ? <OutgoingCallOverlay /> : <ActiveCallScreen />}
      </Styled.FullScreen>
    </Portal>
  );
};
