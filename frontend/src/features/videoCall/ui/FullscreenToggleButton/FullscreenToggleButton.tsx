import type { FC } from "react";

import {
  CloseFullscreen as CloseFullscreenIcon,
  OpenInFull as OpenInFullIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useUnit } from "effector-react";

import {
  ENTER_FULLSCREEN_LABEL,
  EXIT_FULLSCREEN_LABEL,
  FULLSCREEN_TOGGLE_SIZES,
} from "./FullscreenToggleButton.constants";
import * as Styled from "./FullscreenToggleButton.styled";
import type { FullscreenTogglePlacement } from "./FullscreenToggleButton.types";
import { callFullscreenModel } from "../../model";

type FullscreenToggleButtonProps = {
  placement: FullscreenTogglePlacement;
};

export const FullscreenToggleButton: FC<FullscreenToggleButtonProps> = ({ placement }) => {
  const isFullscreen = useUnit(callFullscreenModel.$isFullscreen);
  const { toggle } = useUnit({ toggle: callFullscreenModel.fullscreenToggled });
  const label = isFullscreen ? EXIT_FULLSCREEN_LABEL : ENTER_FULLSCREEN_LABEL;

  return (
    <Tooltip title={label}>
      <Styled.ToggleButton
        $size={FULLSCREEN_TOGGLE_SIZES[placement]}
        aria-label={label}
        onClick={() => toggle()}
      >
        {isFullscreen ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
      </Styled.ToggleButton>
    </Tooltip>
  );
};
