import { Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  justifyContent: "space-between",
  alignItems: $isMobile ? "stretch" : "center",
  width: "100%",
  gap: theme.spacing(2),
}));

export const LeftActions = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  flexGrow: 1,
}));

export const RightActions = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  flexGrow: 1,
}));
