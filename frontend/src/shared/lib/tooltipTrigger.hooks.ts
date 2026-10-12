import { useCallback, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

// Hover is tracked for a real mouse only and a tap opens instead of toggling:
// after a tap the browser fires emulated enter/leave events around the click
// that would otherwise close the tooltip right away.
export const useTooltipTrigger = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const handleClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    setIsOpen(true);
  }, []);
  const handlePointerEnter = useCallback((event: PointerEvent) => {
    if (event.pointerType === "mouse") setIsOpen(true);
  }, []);
  const handlePointerLeave = useCallback((event: PointerEvent) => {
    if (event.pointerType === "mouse") setIsOpen(false);
  }, []);

  return { isOpen, open, close, handleClick, handlePointerEnter, handlePointerLeave };
};
