import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)({
  width: "100%",
});

export const EmptyText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  color: theme.palette.text.secondary,
  padding: theme.spacing(4),
}));

export const LoadMoreBox = styled(Box)({
  display: "flex",
  justifyContent: "center",
  marginTop: 16,
});
