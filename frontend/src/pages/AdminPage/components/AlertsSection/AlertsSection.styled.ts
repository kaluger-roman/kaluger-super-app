import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledToolbar = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
  marginBottom: "16px",
});

export const StyledHistoryTitle = styled(Typography)(({ theme }) => ({
  marginTop: "24px",
  marginBottom: "12px",
  fontWeight: 600,
  color: theme.palette.text.secondary,
}));
