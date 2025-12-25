import { Dialog, DialogTitle } from "@mui/material";

import { styled } from "@shared";

export const StyledDialog = styled(Dialog)<{ $isMobile: boolean }>(({ $isMobile }) => ({
  "& .MuiDialog-paper": {
    borderRadius: $isMobile ? 0 : 2,
    maxHeight: $isMobile ? "100vh" : "90vh",
  },
}));

export const StyledDialogTitle = styled(DialogTitle)<{ $isMobile: boolean }>(
  ({ theme, $isMobile }) => ({
    paddingBottom: $isMobile ? theme.spacing(1) : theme.spacing(2),
  })
);
