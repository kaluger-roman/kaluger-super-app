import type { FC } from "react";

import { PauseCircleOutline as PausedIcon } from "@mui/icons-material";

import * as Styled from "./VideoTile.styled";
import type { TileInterruption } from "../../videoCall.types";

type InterruptionLabelProps = {
  interruption: TileInterruption;
};

// A spinner says "wait, it fixes itself"; a pause icon says "the peer stepped away".
export const InterruptionLabel: FC<InterruptionLabelProps> = ({ interruption }) => (
  <Styled.InterruptionLabel variant="body2" role="status" data-kind={interruption.kind}>
    {interruption.kind === "reconnecting" ? (
      <Styled.InterruptionSpinner size={16} color="inherit" />
    ) : (
      <PausedIcon fontSize="small" />
    )}
    {interruption.label}
  </Styled.InterruptionLabel>
);
