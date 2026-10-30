import { Box } from "@mui/material";

import { styled } from "@shared";

import { SHORT_STAGE_MEDIA } from "../../videoCall.constants";

export const Pill = styled(Box)({
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(46, 125, 71, 0.92)",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
  },
  [SHORT_STAGE_MEDIA]: {
    background: "rgba(46, 125, 71, 0.6)",
  },
});

export const Text = styled(Box)({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
});
