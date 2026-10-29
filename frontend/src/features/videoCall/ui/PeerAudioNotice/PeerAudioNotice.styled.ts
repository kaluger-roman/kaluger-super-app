import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { styled } from "@shared";

// Amber and worded, unlike the red round "mic off" badge: nobody turned this mic off on purpose.
export const Pill = styled(Box)(({ theme }) => ({
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px 5px 8px",
  borderRadius: 12,
  background: alpha(theme.palette.warning.main, 0.92),
  color: theme.palette.common.white,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.35,
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
  },
}));
