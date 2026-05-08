import { Box, Typography, Paper, Chip, Alert } from "@mui/material";

import { styled } from "@shared";

export const SettingsPaper = styled(Paper)(({ theme }) => ({
  padding: "24px",
  borderRadius: "16px",
  border: `1px solid ${theme.palette.divider}`,
}));

export const SettingsTitle = styled(Typography)({
  fontWeight: 600,
  marginBottom: "16px",
});

export const SettingRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px",
  "&:last-child": {
    marginBottom: 0,
  },
});

export const SettingLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
}));

export const SettingDescription = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.875rem",
  marginTop: "4px",
}));

export const IntervalsContainer = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
  marginBottom: "16px",
});

export const IntervalChip = styled(Chip)({});

export const PermissionAlert = styled(Alert)({
  marginTop: "16px",
});
