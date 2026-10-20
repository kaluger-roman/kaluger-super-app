import { InfoOutlined } from "@mui/icons-material";
import { Alert, Box, Paper, TextField, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledControls = styled(Box)({
  display: "flex",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "24px",
});

export const StyledFilesWrapper = styled(Box)({
  marginTop: "24px",
});

export const StyledFileCard = styled(Paper)(({ theme }) => ({
  padding: "12px 16px",
  borderRadius: "8px",
  border: `1px solid ${theme.palette.divider}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
}));

export const StyledFileName = styled(Typography)({
  fontFamily: "monospace",
  fontSize: "0.875rem",
});

export const StyledFileInfo = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.875rem",
}));

export const StyledSummary = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: "16px",
}));

export const StyledSettingsRow = styled(Box)({
  display: "flex",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap",
});

export const StyledSettingsField = styled(TextField)({
  minWidth: "220px",
});

export const StyledRetentionHint = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "6px",
  marginTop: "12px",
  color: theme.palette.text.secondary,
}));

export const StyledRetentionHintIcon = styled(InfoOutlined)({
  fontSize: "18px",
  marginTop: "1px",
  flexShrink: 0,
});

export const StyledLimitAlert = styled(Alert)({
  marginTop: "8px",
});
