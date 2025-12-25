import { Box, Dialog, DialogActions, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(1),
}));

type ActionsContainerProps = {
  $isMobile: boolean;
};

export const ActionsContainer = styled(DialogActions)<ActionsContainerProps>(
  ({ theme, $isMobile }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(1),
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  justifyContent: "space-between",
  width: "100%",
  gap: $isMobile ? theme.spacing(2) : 0,
}));

type ActionsRightProps = {
  $isMobile: boolean;
};

export const ActionsRight = styled(Box)<ActionsRightProps>(
  ({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  gap: theme.spacing(1),
}));

type StyledDialogProps = {
  $isMobile: boolean;
};

export const StyledDialog = styled(Dialog)<StyledDialogProps>(({ theme, $isMobile }) => ({
  "& .MuiDialog-paper": {
    borderRadius: $isMobile ? 0 : theme.spacing(2),
    maxHeight: $isMobile ? "100vh" : "90vh",
  },
}));
