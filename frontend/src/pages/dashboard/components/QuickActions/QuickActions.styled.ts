import { Box, Card, CardContent, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  [theme.breakpoints.up("sm")]: {
    gridTemplateColumns: "repeat(4, 1fr)",
  },
}));

export const ActionCard = styled(Card)({
  cursor: "pointer",
});

export const ActionCardContent = styled(CardContent)(({ theme }) => ({
  textAlign: "center",
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

export const ActionIcon = styled(Box)(({ theme }) => ({
  fontSize: 32,
  marginBottom: theme.spacing(1),
}));

export const ActionTitle = styled(Typography)({
  fontSize: "0.9rem",
  fontWeight: 600,
});

export const NewLessonCard = styled(Card)(({ theme }) => ({
  cursor: "pointer",
  backgroundColor: theme.palette.primary.main,
  color: "white",
}));

export const NewLessonCardContent = styled(CardContent)(({ theme }) => ({
  textAlign: "center",
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

export const NewLessonIcon = styled(Box)(({ theme }) => ({
  fontSize: 32,
  marginBottom: theme.spacing(1),
}));

export const NewLessonTitle = styled(Typography)({
  fontSize: "0.9rem",
  fontWeight: 600,
});

export const NewLessonSubtitle = styled(Typography)({
  opacity: 0.8,
});
