import type { FC } from "react";

import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

import { CallConfirmDialog, CallOverlay } from "@features/videoCall";
import { theme } from "@shared";

import type { AppFrameProps } from "./AppFrame.types";

// The call layer is mounted once, outside the loading switch: a call that arrives while the app
// loads is visible at once and is not remounted when loading ends.
export const AppFrame: FC<AppFrameProps> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
    <CallConfirmDialog />
    <CallOverlay />
  </ThemeProvider>
);
