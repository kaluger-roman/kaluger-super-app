import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
  marginTop: theme.spacing(3),
}));

export const WeekText = styled(Typography)({
  minWidth: "120px",
  textAlign: "center",
});
