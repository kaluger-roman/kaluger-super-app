import type { FC } from "react";

import { useUnit } from "effector-react";

import { callModel } from "../../model";
import { ActiveCallScreen } from "../ActiveCallScreen";
import { IncomingCallModal } from "../IncomingCallModal";
import { OutgoingCallOverlay } from "../OutgoingCallOverlay";
import * as Styled from "./CallOverlay.styled";

export const CallOverlay: FC = () => {
  const phase = useUnit(callModel.$callPhase);

  if (phase === "incoming") {
    return <IncomingCallModal />;
  }

  if (phase === "outgoing" || phase === "active") {
    return (
      <Styled.FullScreen>
        {phase === "outgoing" ? <OutgoingCallOverlay /> : <ActiveCallScreen />}
      </Styled.FullScreen>
    );
  }

  return null;
};
