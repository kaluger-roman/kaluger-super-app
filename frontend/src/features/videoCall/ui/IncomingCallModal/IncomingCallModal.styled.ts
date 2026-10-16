import { Box, Dialog, IconButton, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 24,
    padding: 8,
    minWidth: 320,
  },
});

export const Content = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  padding: "28px 24px 12px",
});

export const Caption = styled(Typography)({
  letterSpacing: "0.06em",
});

export const Name = styled(Typography)({
  fontWeight: 600,
});

export const Actions = styled(Box)({
  display: "flex",
  justifyContent: "center",
  gap: 48,
  padding: "12px 24px 24px",
});

export const ActionColumn = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
});

export const AcceptButton = styled(IconButton)(({ theme }) => ({
  width: 60,
  height: 60,
  color: "#ffffff",
  background: theme.palette.success.main,
  "&:hover": {
    background: theme.palette.success.dark,
  },
}));

export const DeclineButton = styled(IconButton)({
  width: 60,
  height: 60,
  color: "#ffffff",
  background: "#d32f2f",
  "&:hover": {
    background: "#b71c1c",
  },
});
