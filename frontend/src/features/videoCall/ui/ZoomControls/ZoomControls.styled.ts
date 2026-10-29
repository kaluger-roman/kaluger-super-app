import { Box, ButtonBase, IconButton, Typography } from "@mui/material";

import { styled } from "@shared";

import { COMPACT_ZOOM_MEDIA } from "../../videoCall.constants";

export const Group = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: 4,
  borderRadius: 999,
  background: "rgba(0, 0, 0, 0.45)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  backdropFilter: "blur(6px)",
});

export const StepButton = styled(IconButton)(({ theme }) => ({
  width: 40,
  height: 40,
  color: theme.palette.common.white,
  "&.Mui-disabled": {
    color: "rgba(255, 255, 255, 0.35)",
  },
}));

export const ScaleLabel = styled(Typography)(({ theme }) => ({
  minWidth: 48,
  textAlign: "center",
  color: theme.palette.common.white,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
}));

export const ResetButton = styled(ButtonBase)<{ $hidden: boolean }>(({ theme, $hidden }) => ({
  visibility: $hidden ? "hidden" : "visible",
  ...theme.typography.body2,
  height: 40,
  marginLeft: 2,
  padding: "0 14px 0 10px",
  gap: 6,
  borderRadius: 999,
  color: theme.palette.common.white,
  fontWeight: 500,
  whiteSpace: "nowrap",
  background: "rgba(255, 255, 255, 0.16)",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.26)",
  },
  "& .MuiSvgIcon-root": {
    fontSize: 20,
  },
  [COMPACT_ZOOM_MEDIA]: {
    width: 40,
    padding: 0,
  },
}));

export const ResetLabel = styled("span")({
  [COMPACT_ZOOM_MEDIA]: {
    display: "none",
  },
});
