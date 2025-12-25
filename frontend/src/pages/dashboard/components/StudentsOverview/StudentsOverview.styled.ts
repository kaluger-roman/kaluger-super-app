import { Paper, Typography, Box, Card, Button } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const Title = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
}));

export const StudentsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

export const StudentCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(1.5),
}));

export const StudentCardContent = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const StudentName = styled(Typography)({
  fontWeight: 600,
});

export const ViewAllButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));
