import { Box } from "@mui/material";

import { styled } from "@shared";

import { CALL_LAYER_Z_INDEX_OFFSET } from "../../videoCall.constants";

export const FullScreen = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: theme.zIndex.modal + CALL_LAYER_Z_INDEX_OFFSET,
  background: theme.palette.common.black,
}));
