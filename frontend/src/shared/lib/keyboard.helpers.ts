import type { KeyboardEvent } from "react";

export const handleActivationKey =
  <T extends HTMLElement = HTMLElement>(
    handler: (event: KeyboardEvent<T>) => void,
  ) =>
  (event: KeyboardEvent<T>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler(event);
    }
  };
