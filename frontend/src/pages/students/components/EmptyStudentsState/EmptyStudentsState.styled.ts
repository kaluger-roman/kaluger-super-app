import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  padding: theme.spacing(6),
  textAlign: "center",
}));

export const Description = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));
