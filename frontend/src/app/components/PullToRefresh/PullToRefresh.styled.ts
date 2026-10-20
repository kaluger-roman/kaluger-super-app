import { Box as MuiBox } from "@mui/material";

import { styled } from "@shared";

// At rest the wrapper has no transform: a transform would become the containing block of every
// fixed overlay inside (toasts, offline banner, install prompt) and trap it below the call screen.
export const Wrapper = styled(MuiBox)<{ $pullDistance: number; $isRefreshing: boolean }>`
  transform: ${({ $pullDistance }) => ($pullDistance > 0 ? `translateY(${$pullDistance}px)` : "none")};
  transition: ${({ $isRefreshing, $pullDistance }) =>
    $isRefreshing || $pullDistance > 0 ? "none" : "transform 0.3s ease-out"};
  will-change: ${({ $pullDistance }) => ($pullDistance > 0 ? "transform" : "auto")};
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
