import { Box, Button } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginTop: theme.spacing(2.5),
  "& .MuiAlert-root": {
    width: "100%",
  },
}));

export const LoadMoreButton = styled(Button)<{ $isLoading: boolean }>(({ theme, $isLoading }) => ({
  minWidth: 260,
  cursor: $isLoading ? "progress" : "pointer",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    minWidth: 0,
  },
}));
