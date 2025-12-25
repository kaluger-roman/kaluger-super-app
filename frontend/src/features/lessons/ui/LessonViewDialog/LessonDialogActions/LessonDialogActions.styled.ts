import { Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  gap: $isMobile ? theme.spacing(2) : theme.spacing(1),
  justifyContent: "space-between",
  width: "100%",
}));

export const ActionsColumn = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  flex: 1,
}));

export const CloseEditColumn = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  flex: 1,
  marginTop: $isMobile ? theme.spacing(2) : 0,
}));
