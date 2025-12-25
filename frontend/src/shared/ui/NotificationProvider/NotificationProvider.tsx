import type { FC } from "react";

import { AlertColor } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./NotificationProvider.styled";
import { notificationsModel } from "../../model";

export const NotificationProvider: FC = () => {
  const notification = useUnit(notificationsModel.$notification);

  const handleClose = () => {
    notificationsModel.hideNotification();
  };

  if (!notification) return null;

  return (
    <Styled.StyledSnackbar
      open={!!notification}
      autoHideDuration={notification.type === "error" ? 8000 : 4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Styled.StyledAlert
        onClose={handleClose}
        severity={notification.type as AlertColor}
        variant="filled"
      >
        {notification.message}
      </Styled.StyledAlert>
    </Styled.StyledSnackbar>
  );
};
