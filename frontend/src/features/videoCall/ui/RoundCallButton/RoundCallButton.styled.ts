import { IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

import { styled } from "@shared";

import type { RoundCallButtonTone } from "./RoundCallButton.types";

type RoundCallButtonProps = {
  $tone: RoundCallButtonTone;
  $size: number;
  $wide?: boolean;
};

const toneColors = (theme: Theme, tone: RoundCallButtonTone) => {
  if (tone === "danger") {
    return { background: theme.palette.error.main, hover: theme.palette.error.dark };
  }
  if (tone === "success") {
    return { background: theme.palette.success.main, hover: theme.palette.success.dark };
  }
  if (tone === "active") {
    return { background: theme.palette.primary.main, hover: theme.palette.primary.dark };
  }
  return {
    background: alpha(theme.palette.common.white, 0.16),
    hover: alpha(theme.palette.common.white, 0.26),
  };
};

export const RoundCallButton = styled(IconButton)<RoundCallButtonProps>(({
  theme,
  $tone,
  $size,
  $wide = false,
}) => {
  const colors = toneColors(theme, $tone);
  return {
    width: $wide ? $size + 8 : $size,
    height: $size,
    borderRadius: $size / 2,
    color: theme.palette.common.white,
    background: colors.background,
    "&:hover": {
      background: colors.hover,
    },
  };
});
