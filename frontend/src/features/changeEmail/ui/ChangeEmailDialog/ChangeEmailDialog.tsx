import type { FC, KeyboardEvent } from "react";

import { Dialog, DialogTitle, DialogContent, DialogActions, Alert, Box } from "@mui/material";
import { useUnit } from "effector-react";

import { Button } from "@shared";

import { CODE_LENGTH } from "./ChangeEmailDialog.constants";
import { InitiateStep } from "./InitiateStep";
import { VerifyStep } from "./VerifyStep";
import { changeEmailModel } from "../../models";

export const ChangeEmailDialog: FC = () => {
  const isOpen = useUnit(changeEmailModel.$isDialogOpen);
  const newEmail = useUnit(changeEmailModel.$newEmail);
  const password = useUnit(changeEmailModel.$password);
  const code = useUnit(changeEmailModel.$code);
  const error = useUnit(changeEmailModel.$error);
  const isCodeStep = useUnit(changeEmailModel.$isCodeStep);
  const canResend = useUnit(changeEmailModel.$canResend);
  const resendTimer = useUnit(changeEmailModel.$resendTimer);

  const actions = useUnit({
    close: changeEmailModel.dialogClosed,
    initiateSubmitted: changeEmailModel.initiateSubmitted,
    verifySubmitted: changeEmailModel.verifySubmitted,
    resendRequested: changeEmailModel.resendRequested,
  });

  const isInitiateValid = newEmail.length > 0 && password.length > 0;
  const isVerifyValid = code.length === CODE_LENGTH;

  const handleSubmit = () => {
    if (isCodeStep) {
      if (isVerifyValid) actions.verifySubmitted();
    } else {
      if (isInitiateValid) actions.initiateSubmitted();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onClose={actions.close} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <DialogTitle>{isCodeStep ? "Подтверждение смены email" : "Смена email"}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          {isCodeStep ? <VerifyStep /> : <InitiateStep />}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        {isCodeStep && (
          <Button variant="text" onClick={() => actions.resendRequested()} disabled={!canResend}>
            {!canResend ? `Отправить снова (${resendTimer}с)` : "Отправить код повторно"}
          </Button>
        )}
        <Button onClick={actions.close}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isCodeStep ? !isVerifyValid : !isInitiateValid}
        >
          {isCodeStep ? "Подтвердить" : "Сменить email"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
