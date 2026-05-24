import type { KeyboardEvent } from "react";

export const handleActivationKey = (handler: () => void) =>
  (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  };
