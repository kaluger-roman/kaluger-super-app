import { Box, ButtonBase } from "@mui/material";

import { styled } from "@shared";

// Above the pills: until the tap the tile shows nothing worth reading.
export const Overlay = styled(ButtonBase)({
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(0, 0, 0, 0.6)",
});

export const Pill = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  maxWidth: "100%",
  padding: "14px 24px 14px 18px",
  borderRadius: 999,
  background: theme.palette.common.white,
  color: theme.palette.primary.main,
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.3,
  textAlign: "left",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
    fontSize: 28,
  },
}));
