import { Dialog, DialogContent, DialogActions, Box, Alert } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

export const StyledDialog = styled(Dialog)<{ $isMobile: boolean }>(({ $isMobile }) => ({
  "& .MuiPaper-root": {
    borderRadius: $isMobile ? 0 : 2,
    maxHeight: $isMobile ? "100vh" : "90vh",
  },
}));

export const TitleContainer = styled(Box)();

export const ContentContainer = styled(DialogContent)<{ $isMobile: boolean }>(
  ({ theme, $isMobile }) => ({
    paddingLeft: $isMobile ? theme.spacing(2) : theme.spacing(3),
    paddingRight: $isMobile ? theme.spacing(2) : theme.spacing(3),
  })
);

export const FormContainer = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: "column",
  gap: $isMobile ? theme.spacing(2) : theme.spacing(3),
  marginTop: theme.spacing(2),
}));

export const CurrentTimeAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const StyledDialogActions = styled(DialogActions)<{ $isMobile: boolean }>(
  ({ theme, $isMobile }) => ({
    paddingLeft: $isMobile ? theme.spacing(2) : theme.spacing(3),
    paddingRight: $isMobile ? theme.spacing(2) : theme.spacing(3),
    paddingTop: $isMobile ? theme.spacing(2) : theme.spacing(1.5),
    paddingBottom: $isMobile ? theme.spacing(2) : theme.spacing(1.5),
    flexDirection: $isMobile ? "column" : "row",
    gap: $isMobile ? theme.spacing(1) : 0,
  })
);
