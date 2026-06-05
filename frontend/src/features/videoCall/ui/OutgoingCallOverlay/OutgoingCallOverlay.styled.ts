import { Box, IconButton, Typography } from "@mui/material";

import { styled } from "@shared";

export const Backdrop = styled(Box)({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  padding: 24,
  background: "radial-gradient(circle at 50% 30%, #0d2417 0%, #050d08 100%)",
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

export const CancelButton = styled(IconButton)({
  width: 64,
  height: 64,
  marginTop: 16,
  color: "#ffffff",
  background: "#d32f2f",
  "&:hover": {
    background: "#b71c1c",
  },
});

export const CancelLabel = styled(Typography)({
  color: "rgba(255, 255, 255, 0.7)",
});
