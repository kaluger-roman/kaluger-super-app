import type { NavigateFunction } from "react-router-dom";

let navigateInstance: NavigateFunction | null = null;

export const setNavigate = (navigate: NavigateFunction): void => {
  navigateInstance = navigate;
};

export const getNavigate = (): NavigateFunction | null => {
  return navigateInstance;
};

export const navigate = (to: string, options?: { replace?: boolean }): void => {
  if (!navigateInstance) {
    console.error("Navigate function is not initialized. Call setNavigate first.");
    return;
  }
  navigateInstance(to, options);
};
