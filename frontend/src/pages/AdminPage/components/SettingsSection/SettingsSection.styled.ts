import { Box, TextField, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledSection = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "16px",
  maxWidth: "560px",
});

export const StyledHeading = styled(Typography)({
  fontWeight: 600,
});

export const StyledEmailField = styled(TextField)({
  width: "100%",
});

export const StyledActions = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
});

export const StyledHint = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));
