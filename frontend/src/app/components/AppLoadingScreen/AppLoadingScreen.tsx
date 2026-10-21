import type { FC } from "react";

import { CircularProgress } from "@mui/material";

import { CallOverlay } from "@features/videoCall";

import * as Styled from "./AppLoadingScreen.styled";

// A call may arrive while the app is still loading its data, so the call layer is up already.
export const AppLoadingScreen: FC = () => (
  <>
    <Styled.StyledBackdrop open={true}>
      <CircularProgress color="inherit" />
    </Styled.StyledBackdrop>
    <CallOverlay />
  </>
);
