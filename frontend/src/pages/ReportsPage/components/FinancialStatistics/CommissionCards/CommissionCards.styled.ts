import { Box, Card, CardContent, Typography } from "@mui/material";

import { styled } from "@shared";

const COMMISSION_COLOR = "#6A1B9A";

export const StatBox = styled(Box)({
  flex: "1",
  minWidth: 300,
});

export const CommissionCard = styled(Card)({
  backgroundColor: "#F3E5F5",
  border: "1px solid #CE93D8",
});

export const CommissionCardContent = styled(CardContent)(({ theme }) => ({
  "& .icon": {
    color: COMMISSION_COLOR,
    marginRight: theme.spacing(1),
  },
}));

export const CommissionTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const CommissionAmount = styled(Typography)(({ theme }) => ({
  color: COMMISSION_COLOR,
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));
