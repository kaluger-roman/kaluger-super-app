import { Box, Typography, Card, CardContent } from "@mui/material";

import { styled } from "@shared";

export const StatBox = styled(Box)({
  flex: "1",
  minWidth: 300,
});

export const GreenCard = styled(Card)({
  backgroundColor: "#e8f5e8",
});

export const GreenCardContent = styled(CardContent)(({ theme }) => ({
  "& .icon": {
    color: "#2E7D47",
    marginRight: theme.spacing(1),
  },
}));

export const GreenTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const GreenAmount = styled(Typography)(({ theme }) => ({
  color: "#2E7D47",
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));

export const BlueCard = styled(Card)({
  backgroundColor: "#e3f2fd",
});

export const BlueCardContent = styled(CardContent)(({ theme }) => ({
  "& .icon": {
    color: "#1565c0",
    marginRight: theme.spacing(1),
  },
}));

export const BlueTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const BlueAmount = styled(Typography)(({ theme }) => ({
  color: "#1565c0",
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));

export const TealCard = styled(Card)({
  backgroundColor: "#e0f2f1",
});

export const TealCardContent = styled(CardContent)(({ theme }) => ({
  "& .icon": {
    color: "#00695c",
    marginRight: theme.spacing(1),
  },
}));

export const TealTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const TealAmount = styled(Typography)(({ theme }) => ({
  color: "#00695c",
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));
