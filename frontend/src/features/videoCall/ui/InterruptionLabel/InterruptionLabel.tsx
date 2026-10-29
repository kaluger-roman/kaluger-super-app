import type { FC } from "react";

import { PauseCircleOutline as PausedIcon } from "@mui/icons-material";
import { useUnit } from "effector-react";

import * as Styled from "./InterruptionLabel.styled";
import { peerViewModel } from "../../model";

// A spinner says "wait, it fixes itself"; a pause icon says "the peer stepped away".
export const InterruptionLabel: FC = () => {
  const interruption = useUnit(peerViewModel.$peerInterruption);
  if (!interruption) return null;

  return (
    <Styled.Label variant="body2" role="status" data-kind={interruption.kind}>
      {interruption.kind === "reconnecting" ? (
        <Styled.Spinner size={16} color="inherit" />
      ) : (
        <PausedIcon fontSize="small" />
      )}
      {interruption.label}
    </Styled.Label>
  );
};
