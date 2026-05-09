import type { FC } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useUnit } from "effector-react";

import { Button } from "@shared";

import { logoutConfirmationModel } from "../../models";

export const LogoutConfirmationDialog: FC = () => {
  const isOpen = useUnit(logoutConfirmationModel.$isDialogOpen);

  const actions = useUnit({
    cancel: logoutConfirmationModel.logoutCancelled,
    confirm: logoutConfirmationModel.logoutConfirmed,
  });

  return (
    <Dialog open={isOpen} onClose={actions.cancel} maxWidth="xs" fullWidth>
      <DialogTitle>Выход из аккаунта</DialogTitle>
      <DialogContent>
        <DialogContentText>Вы действительно хотите выйти?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={actions.cancel}>Отмена</Button>
        <Button onClick={actions.confirm} variant="contained" color="error">
          Выйти
        </Button>
      </DialogActions>
    </Dialog>
  );
};
