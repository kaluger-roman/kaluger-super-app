import { Box } from "@mui/material";

import { ABOVE_MODAL_Z_OFFSET, styled } from "@shared";

export const FullScreen = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: theme.zIndex.modal + ABOVE_MODAL_Z_OFFSET.call,
  background: theme.palette.common.black,
}));
