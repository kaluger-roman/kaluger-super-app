import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

import { CALL_SCREEN_BACKGROUND } from "../../videoCall.constants";

export const Backdrop = styled(Box)({
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  padding: 24,
  background: CALL_SCREEN_BACKGROUND,
});

export const Caption = styled(Typography)({
  color: "rgba(255, 255, 255, 0.7)",
  letterSpacing: "0.04em",
});

export const Name = styled(Typography)({
  color: "#ffffff",
  fontWeight: 600,
});

export const Ring = styled(Box)({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&::after": {
    content: '""',
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    border: "2px solid rgba(129, 199, 132, 0.5)",
  },
});

export const CancelSlot = styled(Box)({
  marginTop: 16,
});

export const CancelLabel = styled(Typography)({
  color: "rgba(255, 255, 255, 0.7)",
});
