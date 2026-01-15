import { Card, CardContent, Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledCard = styled(Card)(({ theme }) => ({
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    boxShadow: theme.shadows[2],
    transform: "translateY(-1px)",
  },
}));

export const StyledCardContent = styled(CardContent)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

export const HeaderRow = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

export const ContentColumn = styled(Box)({
  flex: 1,
});

export const TitleRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
  flexWrap: "wrap",
}));

export const InfoRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(3),
  marginBottom: theme.spacing(1),
  flexWrap: "wrap",
}));

export const BottomRow = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const StudentName = styled(Typography)({
  fontWeight: 600,
});

export const PriceText = styled(Typography)({
  fontWeight: 600,
});
