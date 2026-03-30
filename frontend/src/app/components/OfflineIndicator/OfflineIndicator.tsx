import { Snackbar, Alert } from "@mui/material";
import { useUnit } from "effector-react";

import { appInitModel } from "../../model";

export const OfflineIndicator = () => {
  const isOnline = useUnit(appInitModel.$isOnline);

  return (
    <Snackbar
      open={!isOnline}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity="warning" variant="filled">
        Нет подключения к интернету. Данные могут быть неактуальны
      </Alert>
    </Snackbar>
  );
};
