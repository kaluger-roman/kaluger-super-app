import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const Text = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const StepList = styled("ul")(({ theme }) => ({
  margin: 0,
  paddingLeft: 20,
  color: theme.palette.text.primary,
  ...theme.typography.body2,
}));

export const Step = styled("li")({
  marginTop: 2,
});
