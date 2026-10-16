import { Box, Typography, Card, CardContent, ButtonBase } from "@mui/material";

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

export const HistoryLink = styled(ButtonBase)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.25),
  marginTop: theme.spacing(1),
  padding: theme.spacing(0.25, 0),
  color: "#00695c",
  fontSize: "0.875rem",
  fontWeight: 600,
  borderRadius: 4,
  "&:hover": {
    textDecoration: "underline",
  },
  "&.Mui-focusVisible": {
    outline: "2px solid #00695c",
    outlineOffset: 2,
  },
}));
