import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const useIsTextClamped = (text: string, expanded: boolean) => {
  const ref = useRef<HTMLElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    setIsClamped(node.scrollHeight > node.clientHeight + 1);
  }, []);

  useLayoutEffect(() => {
    if (expanded) return;
    measure();

    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, [text, expanded, measure]);

  return { ref, isClamped };
};
