import { Backdrop } from "@mui/material";

import { ABOVE_MODAL_Z_OFFSET, styled } from "@shared";

export const ModalBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.modal + ABOVE_MODAL_Z_OFFSET.blockingOverlay,
}));
