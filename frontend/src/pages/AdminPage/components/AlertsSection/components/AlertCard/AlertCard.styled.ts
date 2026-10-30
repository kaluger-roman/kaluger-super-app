import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";
import type { AdminAlertSeverity } from "@shared";

export const StyledCard = styled(Paper)<{ $severity: AdminAlertSeverity; $isMuted: boolean }>(({
  theme,
  $severity,
  $isMuted,
}) => {
  const accent = $severity === "critical" ? theme.palette.error.main : theme.palette.warning.main;
  return {
    padding: "16px 20px",
    borderRadius: "12px",
    border: `1px solid ${theme.palette.divider}`,
    borderLeft: `4px solid ${$isMuted ? theme.palette.action.disabled : accent}`,
    backgroundColor: $isMuted ? theme.palette.action.hover : theme.palette.background.paper,
    [theme.breakpoints.down("sm")]: {
      padding: "12px 14px",
    },
  };
});

export const StyledHeader = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
});

export const StyledChips = styled(Box)({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
});

export const StyledTitle = styled(Typography)<{ $isMuted: boolean }>(({ theme, $isMuted }) => ({
  marginTop: "10px",
  fontWeight: 600,
  fontSize: "1rem",
  color: $isMuted ? theme.palette.text.secondary : theme.palette.text.primary,
}));

export const StyledDescription = styled(Typography)(({ theme }) => ({
  marginTop: "4px",
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
  overflowWrap: "anywhere",
}));

export const StyledMeta = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  marginTop: "12px",
  fontSize: "0.8125rem",
  color: theme.palette.text.secondary,
}));
