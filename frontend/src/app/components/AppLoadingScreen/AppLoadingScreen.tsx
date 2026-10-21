import type { FC } from "react";

import { CircularProgress } from "@mui/material";

import * as Styled from "./AppLoadingScreen.styled";

export const AppLoadingScreen: FC = () => (
  <Styled.StyledBackdrop open={true}>
    <CircularProgress color="inherit" />
  </Styled.StyledBackdrop>
);
