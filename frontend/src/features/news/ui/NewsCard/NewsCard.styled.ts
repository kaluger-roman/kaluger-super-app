import { Box, Card, CardContent, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const StyledCardContent = styled(CardContent)({
  "&:last-child": {
    paddingBottom: 16,
  },
});

export const Title = styled(Typography)({
  fontWeight: 600,
}) as typeof Typography;

export const DateText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1.5),
}));

export const ContentBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginTop: theme.spacing(1),
  color: theme.palette.text.primary,
})) as typeof Typography;

export const ListItem = styled(Typography)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  position: "relative",
  "&::before": {
    content: '"•"',
    position: "absolute",
    left: 0,
    color: theme.palette.primary.main,
    fontWeight: 700,
  },
})) as typeof Typography;
