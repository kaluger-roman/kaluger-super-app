import type { FC } from "react";

import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";

import { CONTINUE_CALL_LABEL } from "./ContinueCallOverlay.constants";
import * as Styled from "./ContinueCallOverlay.styled";

type ContinueCallOverlayProps = {
  onContinue: () => void;
};

// A tap on it neither shows the fullscreen controls nor counts towards a double tap.
export const ContinueCallOverlay: FC<ContinueCallOverlayProps> = ({ onContinue }) => (
  <Styled.Overlay
    onClick={onContinue}
    onPointerDown={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
  >
    <Styled.Pill>
      <PlayArrowIcon />
      {CONTINUE_CALL_LABEL}
    </Styled.Pill>
  </Styled.Overlay>
);
