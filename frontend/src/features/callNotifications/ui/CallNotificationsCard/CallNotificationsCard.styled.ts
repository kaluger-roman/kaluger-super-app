import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { styled } from "@shared";

import type { CardTone } from "./CallNotificationsCard.types";

export const CardRoot = styled(Paper)<{ $tone: CardTone }>(({ theme, $tone }) => ({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "start",
  gap: 14,
  padding: "16px 8px 16px 16px",
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette[$tone].main, 0.35)}`,
  background: alpha(theme.palette[$tone].main, 0.06),
  boxShadow: "none",
  [theme.breakpoints.down("sm")]: {
    gap: 12,
    padding: "14px 4px 14px 14px",
  },
}));

export const IconCircle = styled(Box)<{ $tone: CardTone }>(({ theme, $tone }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  color: theme.palette.common.white,
  background: theme.palette[$tone].main,
}));

export const Content = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 10,
  paddingTop: 2,
});

export const Title = styled(Typography)({
  fontWeight: 600,
  lineHeight: 1.35,
});

export const EnableButton = styled(Button)({
  borderRadius: 999,
  paddingLeft: 24,
  paddingRight: 24,
});

export const CloseButton = styled(IconButton)({
  marginTop: -4,
});
