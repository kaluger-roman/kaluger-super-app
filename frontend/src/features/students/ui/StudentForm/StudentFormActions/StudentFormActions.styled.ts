import { Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  justifyContent: "space-between",
  width: "100%",
  gap: $isMobile ? theme.spacing(2) : 0,
}));

export const RightActions = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  gap: theme.spacing(1),
}));
