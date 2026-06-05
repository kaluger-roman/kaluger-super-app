import { Backdrop } from "@mui/material";

import { styled } from "@shared";

// Same full-screen dimmed overlay as the app-init and $isBlocking backdrops, so a
// route chunk load looks identical to other loading states instead of a second,
// differently-styled spinner on a white page.
export const FallbackBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.modal + 1,
}));
