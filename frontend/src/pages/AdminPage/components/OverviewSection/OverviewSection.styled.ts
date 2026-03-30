import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
});

export const StyledCard = styled(Paper)(({ theme }) => ({
  padding: "24px",
  borderRadius: "12px",
  border: `1px solid ${theme.palette.divider}`,
  textAlign: "center",
}));

export const StyledValue = styled(Typography)({
  fontWeight: 700,
  fontSize: "2rem",
});

export const StyledLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: "4px",
}));
