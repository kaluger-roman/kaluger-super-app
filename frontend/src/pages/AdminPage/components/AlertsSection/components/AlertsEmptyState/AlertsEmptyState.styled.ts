import { CheckCircleOutline } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledEmpty = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
  padding: "32px 16px",
  borderRadius: "12px",
  border: `1px dashed ${theme.palette.divider}`,
  textAlign: "center",
}));

export const StyledIcon = styled(CheckCircleOutline)(({ theme }) => ({
  fontSize: "40px",
  color: theme.palette.success.main,
}));

export const StyledText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));
