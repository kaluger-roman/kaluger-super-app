import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionPaper = styled(Paper)({
  padding: "16px",
});

export const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const Row = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

export const LabelBox = styled(Box)({
  minWidth: 0,
});

export const Label = styled(Typography)({
  fontWeight: 500,
});

export const Description = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: 2,
}));
