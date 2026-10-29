import { Box, Paper, Typography } from "@mui/material";

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
  gap: "12px",
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

export const DeniedHelpBox = styled(Box)({
  marginTop: "16px",
});
