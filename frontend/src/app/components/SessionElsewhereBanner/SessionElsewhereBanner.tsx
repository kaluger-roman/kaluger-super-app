import { Alert, Button, Snackbar } from "@mui/material";
import { useUnit } from "effector-react";

import { sessionTakeoverModel } from "../../model";

export const SessionElsewhereBanner = () => {
  const isElsewhere = useUnit(sessionTakeoverModel.$isSessionElsewhere);
  const takeOver = useUnit(sessionTakeoverModel.takeOverRequested);

  return (
    <Snackbar open={isElsewhere} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert
        severity="info"
        variant="filled"
        action={
          <Button color="inherit" size="small" onClick={() => takeOver()}>
            Использовать здесь
          </Button>
        }
      >
        Приложение открыто в другой вкладке. Звонки и обновления приходят туда
      </Alert>
    </Snackbar>
  );
};
