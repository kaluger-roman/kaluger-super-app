import { Snackbar } from "@mui/material";

import { styled } from "@shared";

export const Indicator = styled(Snackbar)<{ $passThrough: boolean }>(({ $passThrough }) => ({
  ...($passThrough && {
    pointerEvents: "none",
    "& .MuiAlert-root": {
      pointerEvents: "none",
    },
  }),
}));
