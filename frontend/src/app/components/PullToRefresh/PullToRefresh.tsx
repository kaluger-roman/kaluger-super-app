import type { ReactNode } from "react";

import { CircularProgress } from "@mui/material";

import { usePullToRefresh } from "./PullToRefresh.hooks";
import * as Styled from "./PullToRefresh.styled";

export const PullToRefresh = ({ children }: { children: ReactNode }) => {
  const { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd, isStandalone } =
    usePullToRefresh();

  if (!isStandalone) return <>{children}</>;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {pullDistance > 0 && (
        <Styled.Indicator $pullDistance={pullDistance} $isRefreshing={isRefreshing}>
          <CircularProgress size={24} />
        </Styled.Indicator>
      )}
      {children}
    </div>
  );
};
