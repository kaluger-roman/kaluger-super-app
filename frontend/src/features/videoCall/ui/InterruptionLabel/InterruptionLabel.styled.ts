import { CircularProgress, Typography } from "@mui/material";

import { styled } from "@shared";

import { SHORT_STAGE_MEDIA } from "../../videoCall.constants";

// The status reads as its own line under the avatar, not as the avatar's caption.
export const Label = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 16,
  [theme.breakpoints.down("sm")]: {
    marginTop: 12,
  },
  [SHORT_STAGE_MEDIA]: {
    marginTop: 4,
  },
  maxWidth: "100%",
  padding: "6px 14px",
  borderRadius: 999,
  color: theme.palette.common.white,
  background: "rgba(0, 0, 0, 0.45)",
  fontWeight: 500,
  textAlign: "center",
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
  },
}));

export const Spinner = styled(CircularProgress)({
  flexShrink: 0,
});
