import { Box, Typography, Card } from "@mui/material";

import { styled } from "@shared";

export const YellowDebtCard = styled(Card)({
  backgroundColor: "#fff8e1",
});

export const DebtRow = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
});

export const DebtAmount = styled(Typography)({
  fontWeight: "bold",
});
