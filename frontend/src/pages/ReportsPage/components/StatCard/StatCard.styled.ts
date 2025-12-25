import { Box, Typography, Card } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Card)({
  height: "100%",
  backgroundColor: "#f8f9fa",
});

export const IconBox = styled(Box)<{ $color: string }>(({ theme, $color }) => ({
  marginRight: theme.spacing(1),
  color: $color,
}));

export const HeaderBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(1),
}));

export const ValueText = styled(Typography)<{ $color: string }>(({ $color }) => ({
  fontWeight: "bold",
  color: $color,
}));
