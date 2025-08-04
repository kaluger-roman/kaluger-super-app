import React from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";
import { useStore } from "effector-react";
import { $notification, hideNotification } from "../model/notifications";

export const NotificationProvider: React.FC = () => {
  const notification = useStore($notification);

  const handleClose = () => {
    hideNotification();
  };

  if (!notification) return null;

  return (
    <Snackbar
      open={!!notification}
      autoHideDuration={notification.type === "error" ? 8000 : 4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      sx={{ mt: 8 }}
    >
      <Alert
        onClose={handleClose}
        severity={notification.type as AlertColor}
        sx={{ width: "100%" }}
        variant="filled"
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};
