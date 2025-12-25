import { Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.grey[50],
  padding: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    height: "100vh",
    padding: theme.spacing(1),
    overflow: "hidden",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
}));
