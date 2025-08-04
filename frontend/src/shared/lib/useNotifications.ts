import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from "../model/notifications";

export const useNotifications = () => {
  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
