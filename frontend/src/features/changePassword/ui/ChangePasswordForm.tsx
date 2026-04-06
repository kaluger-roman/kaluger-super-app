import type { FC } from "react";

import { TextField, Alert } from "@mui/material";
import { useUnit } from "effector-react";

import { Button } from "@shared";

import { changePasswordModel } from "../models";
import * as Styled from "./ChangePasswordForm.styled";

export const ChangePasswordForm: FC = () => {
  const currentPassword = useUnit(changePasswordModel.$currentPassword);
  const newPassword = useUnit(changePasswordModel.$newPassword);
  const confirmPassword = useUnit(changePasswordModel.$confirmPassword);
  const error = useUnit(changePasswordModel.$error);
  const isLoading = useUnit(changePasswordModel.$isLoading);

  const actions = useUnit({
    currentPasswordChanged: changePasswordModel.currentPasswordChanged,
    newPasswordChanged: changePasswordModel.newPasswordChanged,
    confirmPasswordChanged: changePasswordModel.confirmPasswordChanged,
    formSubmitted: changePasswordModel.formSubmitted,
  });

  const isFormValid =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0;

  return (
    <Styled.SectionPaper elevation={0}>
      <Styled.SectionTitle variant="h6">Смена пароля</Styled.SectionTitle>

      <Styled.FieldsBox>
        <TextField
          fullWidth
          type="password"
          label="Текущий пароль"
          value={currentPassword}
          onChange={(e) => actions.currentPasswordChanged(e.target.value)}
          disabled={isLoading}
        />
        <TextField
          fullWidth
          type="password"
          label="Новый пароль"
          value={newPassword}
          onChange={(e) => actions.newPasswordChanged(e.target.value)}
          disabled={isLoading}
          helperText="Минимум 8 символов, заглавные и строчные буквы, цифра"
        />
        <TextField
          fullWidth
          type="password"
          label="Подтверждение пароля"
          value={confirmPassword}
          onChange={(e) => actions.confirmPasswordChanged(e.target.value)}
          disabled={isLoading}
        />
      </Styled.FieldsBox>

      {error && (
        <Styled.ErrorAlert>
          <Alert severity="error">{error}</Alert>
        </Styled.ErrorAlert>
      )}

      <Styled.ButtonBox>
        <Button
          variant="contained"
          onClick={actions.formSubmitted}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? "Сохранение..." : "Сменить пароль"}
        </Button>
      </Styled.ButtonBox>
    </Styled.SectionPaper>
  );
};
