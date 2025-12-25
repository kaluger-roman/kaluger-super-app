import { Box } from "@mui/material";

import { styled } from "@shared";

export const NowLineBox = styled(Box)<{ $top: number }>(({ theme, $top }) => ({
  position: "absolute",
  left: 0,
  right: 0,
  height: 2,
  backgroundColor: theme.palette.error.main,
  zIndex: 5,
  top: $top,
}));
