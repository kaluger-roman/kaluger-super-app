import type { FC } from "react";

import { TextField, Alert } from "@mui/material";
import { useUnit } from "effector-react";

import { userModel } from "@entities";
import { Button } from "@shared";

import { changeEmailModel } from "../models";
import * as Styled from "./ChangeEmailForm.styled";
import { VerifyCodeForm } from "./VerifyCodeForm";

export const ChangeEmailForm: FC = () => {
  const user = useUnit(userModel.$user);
  const newEmail = useUnit(changeEmailModel.$newEmail);
  const password = useUnit(changeEmailModel.$password);
  const error = useUnit(changeEmailModel.$error);
  const isCodeStep = useUnit(changeEmailModel.$isCodeStep);

  const actions = useUnit({
    newEmailChanged: changeEmailModel.newEmailChanged,
    passwordChanged: changeEmailModel.passwordChanged,
    initiateSubmitted: changeEmailModel.initiateSubmitted,
  });

  if (!user) return null;

  if (isCodeStep) return <VerifyCodeForm />;

  const isInitiateFormValid = newEmail.length > 0 && password.length > 0;

  return (
    <Styled.SectionPaper elevation={0}>
      <Styled.SectionTitle variant="h6">Смена email</Styled.SectionTitle>

      <Styled.CurrentEmailText variant="body2">
        Текущий email: <strong>{user.email}</strong>
      </Styled.CurrentEmailText>

      <Styled.FieldsBox>
        <TextField
          fullWidth
          type="email"
          label="Новый email"
          value={newEmail}
          onChange={(e) => actions.newEmailChanged(e.target.value)}
        />
        <TextField
          fullWidth
          type="password"
          label="Текущий пароль"
          value={password}
          onChange={(e) => actions.passwordChanged(e.target.value)}
          helperText="Введите пароль для подтверждения"
        />
      </Styled.FieldsBox>

      {error && (
        <Styled.ErrorAlertBottom>
          <Alert severity="error">{error}</Alert>
        </Styled.ErrorAlertBottom>
      )}

      <Styled.ButtonBox>
        <Button
          variant="contained"
          onClick={actions.initiateSubmitted}
          disabled={!isInitiateFormValid}
        >
          Сменить email
        </Button>
      </Styled.ButtonBox>
    </Styled.SectionPaper>
  );
};
