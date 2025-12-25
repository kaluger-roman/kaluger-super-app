import { Backdrop } from "@mui/material";

import { styled } from "@shared";

export const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.drawer + 1,
}));

export const ModalBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.modal + 1,
}));
