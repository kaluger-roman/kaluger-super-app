import { Box, Button, DialogActions } from "@mui/material";

import { styled } from "@shared";

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(1),
}));

export const Container = styled(Box)<{ $isMobile: boolean }>(({ $isMobile }) => ({
  display: "flex",
  justifyContent: "space-between",
  width: "100%",
  flexDirection: $isMobile ? "column" : "row",
  gap: $isMobile ? 16 : 0,
}));

export const LeftColumn = styled(Box)({});

export const RightColumn = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  gap: theme.spacing(1),
  flexDirection: $isMobile ? "column" : "row",
}));

export const CancelButton = styled(Button)<{ $isMobile: boolean }>(({ $isMobile }) => ({
  marginRight: $isMobile ? 0 : 8,
}));
