import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const Field = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
}));

export const FieldLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
  fontWeight: 600,
  letterSpacing: 0.2,
  textTransform: "uppercase",
}));

export const EmailRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  flexWrap: "wrap",
}));
