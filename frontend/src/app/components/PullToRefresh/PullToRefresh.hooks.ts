import { useCallback, useRef, useState } from "react";

import { isInStandaloneMode } from "@shared";

import { PULL_THRESHOLD, MAX_PULL } from "./PullToRefresh.constants";

export const usePullToRefresh = () => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const isStandalone = isInStandaloneMode();

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isStandalone || isRefreshing) return;
      if (window.scrollY > 0) return;

      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [isStandalone, isRefreshing]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      setPullDistance(Math.min(delta, MAX_PULL));
    },
    [isRefreshing]
  );

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      window.location.reload();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance]);

  return { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd, isStandalone };
};
