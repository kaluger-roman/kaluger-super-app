import { IconButton } from "@mui/material";

import { styled } from "@shared";

export const ToggleButton = styled(IconButton)<{ $size: number }>(({ theme, $size }) => ({
  flexShrink: 0,
  width: $size,
  height: $size,
  color: theme.palette.common.white,
  background: "rgba(0, 0, 0, 0.5)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  backdropFilter: "blur(4px)",
  "&:hover": {
    background: "rgba(0, 0, 0, 0.7)",
  },
  "& .MuiSvgIcon-root": {
    fontSize: Math.round($size * 0.55),
  },
}));
