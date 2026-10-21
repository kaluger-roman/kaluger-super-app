import { Box, Dialog, Typography } from "@mui/material";

import { styled } from "@shared";

import { CALL_LAYER_Z_INDEX_OFFSET } from "../../videoCall.constants";

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  zIndex: theme.zIndex.modal + CALL_LAYER_Z_INDEX_OFFSET,
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
