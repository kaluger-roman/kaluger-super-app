import { Box, ButtonBase } from "@mui/material";

import { styled } from "@shared";

// Covers the remote tile like the video's ResumeOverlay, above its pills.
export const Overlay = styled(ButtonBase)({
  position: "absolute",
  inset: 0,
  zIndex: 3,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  borderRadius: 16,
  background: "rgba(0, 0, 0, 0.6)",
});

export const Pill = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "14px 24px",
  borderRadius: 999,
  background: theme.palette.common.white,
  color: theme.palette.primary.main,
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.3,
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
    fontSize: 28,
  },
}));
