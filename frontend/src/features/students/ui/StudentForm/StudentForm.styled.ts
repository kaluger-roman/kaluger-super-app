import { Dialog, DialogActions, DialogTitle } from "@mui/material";

import { styled } from "@shared";

export const StyledDialog = styled(Dialog)<{ $isMobile: boolean }>(({ $isMobile }) => ({
  "& .MuiDialog-paper": {
    borderRadius: $isMobile ? 0 : 16,
    maxHeight: $isMobile ? "100vh" : "90vh",
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
}));

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingBottom: theme.spacing(3),
}));
