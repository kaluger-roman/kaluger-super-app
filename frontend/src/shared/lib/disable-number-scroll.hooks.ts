import { useEffect } from "react";

export const useDisableNumberScroll = (
  ref: React.RefObject<HTMLElement | null>
) => {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
    };

    node.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      node.removeEventListener("wheel", onWheel as EventListener);
    };
  }, []);
};
