import type { FC, KeyboardEvent } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Box,
} from "@mui/material";
import { useUnit } from "effector-react";

import { Button, navigate } from "@shared";

import { FORGOT_PASSWORD_PATH } from "./ChangePasswordDialog.constants";
import { changePasswordModel } from "../../models";

export const ChangePasswordDialog: FC = () => {
  const isOpen = useUnit(changePasswordModel.$isDialogOpen);
  const currentPassword = useUnit(changePasswordModel.$currentPassword);
  const newPassword = useUnit(changePasswordModel.$newPassword);
  const confirmPassword = useUnit(changePasswordModel.$confirmPassword);
  const error = useUnit(changePasswordModel.$error);

  const actions = useUnit({
    close: changePasswordModel.dialogClosed,
    currentPasswordChanged: changePasswordModel.currentPasswordChanged,
    newPasswordChanged: changePasswordModel.newPasswordChanged,
    confirmPasswordChanged: changePasswordModel.confirmPasswordChanged,
    formSubmitted: changePasswordModel.formSubmitted,
  });

  const isFormValid =
    currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;

  const handleSubmit = () => {
    if (isFormValid) actions.formSubmitted();
  };

  const handleForgotPassword = () => {
    actions.close();
    navigate(FORGOT_PASSWORD_PATH);
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
      <DialogTitle>Смена пароля</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <Box>
            <TextField
              fullWidth
              type="password"
              label="Текущий пароль"
              value={currentPassword}
              onChange={(e) => actions.currentPasswordChanged(e.target.value)}
            />
            <Box display="flex" justifyContent="flex-start" mt={0.5}>
              <Button variant="text" size="small" onClick={handleForgotPassword}>
                Забыли пароль?
              </Button>
            </Box>
          </Box>
          <TextField
            fullWidth
            type="password"
            label="Новый пароль"
            value={newPassword}
            onChange={(e) => actions.newPasswordChanged(e.target.value)}
            helperText="Минимум 8 символов, заглавные и строчные буквы, цифра"
          />
          <TextField
            fullWidth
            type="password"
            label="Подтверждение пароля"
            value={confirmPassword}
            onChange={(e) => actions.confirmPasswordChanged(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={actions.close}>Отмена</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isFormValid}>
          Сменить пароль
        </Button>
      </DialogActions>
    </Dialog>
  );
};
