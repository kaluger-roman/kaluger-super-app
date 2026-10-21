import { Snackbar, Alert } from "@mui/material";
import { useUnit } from "effector-react";

import { callModel } from "@features/videoCall";

import { appInitModel } from "../../model";

export const OfflineIndicator = () => {
  const isOnline = useUnit(appInitModel.$isOnline);
  const callPhase = useUnit(callModel.$callPhase);
  // During a call the bottom edge belongs to the call controls.
  const vertical = callPhase === "idle" ? "bottom" : "top";

  return (
    <Snackbar open={!isOnline} anchorOrigin={{ vertical, horizontal: "center" }}>
      <Alert severity="warning" variant="filled">
        Нет подключения к интернету. Данные могут быть неактуальны
      </Alert>
    </Snackbar>
  );
};
