import { showSuccess, showError, showWarning, showInfo } from "../model";

export const useNotifications = () => {
  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
