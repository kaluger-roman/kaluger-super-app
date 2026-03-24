import { Box as MuiBox } from "@mui/material";

import { styled } from "@shared";

export const Wrapper = styled(MuiBox)<{ $pullDistance: number; $isRefreshing: boolean }>`
  transform: translateY(${({ $pullDistance }) => $pullDistance}px);
  transition: ${({ $isRefreshing, $pullDistance }) =>
    $isRefreshing || $pullDistance > 0 ? "none" : "transform 0.3s ease-out"};
  will-change: transform;
`;

export const Indicator = styled(MuiBox)<{ $pullDistance: number }>`
  position: absolute;
  top: ${({ $pullDistance }) => $pullDistance / 2 - 12}px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1400;
  opacity: ${({ $pullDistance }) => Math.min($pullDistance / 80, 1)};
  pointer-events: none;
`;
