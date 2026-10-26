import type { FC } from "react";
import { useEffect } from "react";

import { Typography } from "@mui/material";

import { notificationsModel } from "@shared";

import type { ToastPreviewConfig } from "../../CallBackgroundMockupPage.types";
import { MockFrame } from "../MockFrame";

type ToastPreviewProps = {
  toast: ToastPreviewConfig;
};

// Fires the real app toast, the same one the call feature's toasts.model will raise.
export const ToastPreview: FC<ToastPreviewProps> = ({ toast }) => {
  useEffect(() => {
    if (toast.type === "error") notificationsModel.showErrorEvent(toast.message);
    else notificationsModel.showInfoEvent(toast.message);
  }, [toast]);

  return (
    <MockFrame title={toast.frameTitle}>
      <Typography variant="h5" component="h1" fontWeight={600}>
        {toast.pageTitle}
      </Typography>
    </MockFrame>
  );
};
