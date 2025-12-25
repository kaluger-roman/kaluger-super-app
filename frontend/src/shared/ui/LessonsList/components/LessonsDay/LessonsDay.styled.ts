import { styled, Box, Typography } from "@mui/material";

export const DayContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const DayTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  fontWeight: 600,
  textTransform: "capitalize",
  color: theme.palette.text.secondary,
  fontSize: "0.95rem",
}));

export const LessonsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));
