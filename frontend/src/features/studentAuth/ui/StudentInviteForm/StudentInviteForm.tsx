import type { FC } from "react";

import { Alert, Button, TextField, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./StudentInviteForm.styled";
import { studentInviteModel } from "../../models";

export const StudentInviteForm: FC = () => {
  const name = useUnit(studentInviteModel.$name);
  const email = useUnit(studentInviteModel.$email);
  const password = useUnit(studentInviteModel.$password);
  const passwordConfirmation = useUnit(
    studentInviteModel.$passwordConfirmation
  );
  const formError = useUnit(studentInviteModel.$formError);
  const validationState = useUnit(studentInviteModel.$validationState);
  const isRegistering = useUnit(studentInviteModel.$isRegistering);

  const handleSubmit = () => {
    studentInviteModel.formSubmitted();
  };

  return (
    <Styled.Wrapper variant="outlined">
      <Typography variant="h5" component="h1" fontWeight={600}>
        Регистрация в личном кабинете
      </Typography>
      {validationState?.valid && (
        <Typography variant="body2" color="text.secondary">
          Преподаватель <strong>{validationState.tutorName}</strong> пригласил
          вас зарегистрироваться. Заполните данные ниже.
        </Typography>
      )}

      {formError && <Alert severity="error">{formError}</Alert>}

      <Styled.FieldsBox>
        <TextField
          label="ФИО"
          value={name}
          onChange={(e) => studentInviteModel.nameChanged(e.target.value)}
          autoComplete="name"
          required
          fullWidth
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => studentInviteModel.emailChanged(e.target.value)}
          autoComplete="email"
          required
          fullWidth
        />
        <TextField
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => studentInviteModel.passwordChanged(e.target.value)}
          autoComplete="new-password"
          required
          fullWidth
          helperText="Минимум 8 символов, заглавная и строчная буквы, цифра"
        />
        <TextField
          label="Подтверждение пароля"
          type="password"
          value={passwordConfirmation}
          onChange={(e) =>
            studentInviteModel.passwordConfirmationChanged(e.target.value)
          }
          autoComplete="new-password"
          required
          fullWidth
        />
        <Button
          variant="contained"
          size="large"
          disabled={isRegistering}
          fullWidth
          onClick={handleSubmit}
        >
          {isRegistering ? "Регистрируем…" : "Зарегистрироваться"}
        </Button>
      </Styled.FieldsBox>
    </Styled.Wrapper>
  );
};
