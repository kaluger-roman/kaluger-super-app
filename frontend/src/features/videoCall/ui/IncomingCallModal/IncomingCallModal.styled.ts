import { Box, Dialog, Typography } from "@mui/material";

import { ABOVE_MODAL_Z_OFFSET, styled } from "@shared";

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  zIndex: theme.zIndex.modal + ABOVE_MODAL_Z_OFFSET.call,
  "& .MuiDialog-paper": {
    borderRadius: 24,
    padding: 8,
    minWidth: 320,
  },
}));

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

export const LessonBox = styled(Box)(({ theme }) => ({
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  marginTop: 4,
  padding: "10px 16px",
  borderRadius: 12,
  textAlign: "center",
  background: theme.palette.grey[100],
}));

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
