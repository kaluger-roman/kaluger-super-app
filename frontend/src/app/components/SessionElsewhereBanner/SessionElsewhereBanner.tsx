import { Alert, Button, Snackbar } from "@mui/material";
import { useUnit } from "effector-react";

import { ELSEWHERE_TEXT } from "./SessionElsewhereBanner.constants";
import { sessionTakeoverModel } from "../../model";

export const SessionElsewhereBanner = () => {
  const elsewhere = useUnit(sessionTakeoverModel.$sessionElsewhere);
  const actions = useUnit({ takeOver: sessionTakeoverModel.takeOverRequested });

  return (
    <Snackbar open={elsewhere !== null} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert
        severity="info"
        variant="filled"
        action={
          <Button
            color="inherit"
            size="small"
            disabled={elsewhere === "call"}
            onClick={() => actions.takeOver()}
          >
            Использовать здесь
          </Button>
        }
      >
        {elsewhere ? ELSEWHERE_TEXT[elsewhere] : null}
      </Alert>
    </Snackbar>
  );
};
