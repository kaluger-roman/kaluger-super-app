import { Box, Typography, Card } from "@mui/material";

import { styled } from "@shared";

export const StatsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

export const StatBox = styled(Box)({
  flex: "1",
  minWidth: 300,
});

export const TaxTitle = styled(Typography)({
  display: "flex",
  alignItems: "center",
  gap: 4,
});

export const YellowCard = styled(Card)({
  backgroundColor: "#fffde7",
});

export const YellowAmount = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));

export const RedCard = styled(Card)({
  backgroundColor: "#ffebee",
});

export const RedAmount = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));

export const LightGreenCard = styled(Card)({
  backgroundColor: "#f1f8e9",
});

export const LightGreenAmount = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));

export const OrangeCard = styled(Card)({
  backgroundColor: "#fff3e0",
});

export const OrangeAmount = styled(Typography)(({ theme }) => ({
  color: "#e65100",
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));

export const PurpleCard = styled(Card)({
  backgroundColor: "#f3e5f5",
});

export const PurpleAmount = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));
