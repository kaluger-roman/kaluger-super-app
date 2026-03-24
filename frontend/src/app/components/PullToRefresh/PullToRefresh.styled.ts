import { Box as MuiBox } from "@mui/material";

import { styled } from "@shared";

export const Indicator = styled(MuiBox)<{ $pullDistance: number; $isRefreshing: boolean }>`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(${({ $pullDistance }) => Math.min($pullDistance - 40, 20)}px);
  z-index: 1400;
  opacity: ${({ $pullDistance }) => Math.min($pullDistance / 80, 1)};
  transition: ${({ $isRefreshing }) => ($isRefreshing ? "none" : "opacity 0.2s")};
  pointer-events: none;
`;
