import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(3),
  maxWidth: 480,
  margin: "0 auto",
  padding: theme.spacing(6, 3),
  textAlign: "center",
}));

export const Title = styled(Typography)({
  fontWeight: 600,
}) as typeof Typography;

export const Description = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
})) as typeof Typography;
