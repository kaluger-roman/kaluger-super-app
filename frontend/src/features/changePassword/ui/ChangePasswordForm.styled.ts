import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: "16px",
  border: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(3),
}));

export const SectionTitle = styled(Typography)({
  fontWeight: 700,
  marginBottom: "24px",
});

export const FieldsBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const ButtonBox = styled(Box)({
  marginTop: "24px",
  display: "flex",
  justifyContent: "flex-end",
});

export const ErrorAlert = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));
