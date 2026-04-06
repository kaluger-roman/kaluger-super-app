import { Payments } from "@mui/icons-material";
import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const Icon = styled(Payments)({
  color: "#00695c",
});

export const Container = styled(Paper)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  marginBottom: theme.spacing(2),
  backgroundColor: "#e0f2f1",
  borderLeft: "4px solid #00695c",
}));

export const Label = styled(Typography)({
  color: "#004d40",
  fontWeight: 500,
});

export const Amount = styled(Typography)({
  color: "#00695c",
  fontWeight: "bold",
});

export const Separator = styled(Box)(({ theme }) => ({
  width: 1,
  height: 24,
  backgroundColor: "rgba(0, 77, 64, 0.25)",
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
}));
