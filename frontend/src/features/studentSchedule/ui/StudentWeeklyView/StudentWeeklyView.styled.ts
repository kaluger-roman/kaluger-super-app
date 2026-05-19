import { Box, Typography, styled } from "@mui/material";

export const Container = styled(Box)({});

export const EmptyContainer = styled(Box)(({ theme }) => ({
  textAlign: "center",
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

export const DaySection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const DayTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderColor: theme.palette.divider,
  textTransform: "capitalize",
}));

export const LessonsColumn = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));
