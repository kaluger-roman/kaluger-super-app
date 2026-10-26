import type { FC } from "react";

import { ScreenShare as ScreenShareIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";

import { SCREEN_SHARE_LABEL } from "./ScreenShareLabel.constants";
import * as Styled from "./ScreenShareLabel.styled";

export const ScreenShareLabel: FC = () => (
  <Tooltip title={SCREEN_SHARE_LABEL}>
    <Styled.Pill>
      <ScreenShareIcon fontSize="small" />
      <Styled.Text>{SCREEN_SHARE_LABEL}</Styled.Text>
    </Styled.Pill>
  </Tooltip>
);
