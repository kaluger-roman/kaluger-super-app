import type { FC } from "react";

import { Alert, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { TextField, Button } from "@shared";

import * as Styled from "./ResetPasswordForm.styled";
import { resetPasswordModel } from "../../models";

type ResetPasswordFormProps = {
  token: string;
};

export const ResetPasswordForm: FC<ResetPasswordFormProps> = ({ token }) => {
  useGate(resetPasswordModel.ResetPasswordFormGate, { token });

  const tokenStatus = useUnit(resetPasswordModel.$tokenStatus);
  const tokenError = useUnit(resetPasswordModel.$tokenError);
  const newPassword = useUnit(resetPasswordModel.$newPassword);
  const confirmPassword = useUnit(resetPasswordModel.$confirmPassword);
  const error = useUnit(resetPasswordModel.$error);
  const isSuccess = useUnit(resetPasswordModel.$isSuccess);

  const actions = useUnit({
    newPasswordChanged: resetPasswordModel.newPasswordChanged,
    confirmPasswordChanged: resetPasswordModel.confirmPasswordChanged,
    formSubmitted: resetPasswordModel.formSubmitted,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isPasswordsMatch = confirmPassword.length === 0 || newPassword === confirmPassword;
  const mismatchMessage = !isPasswordsMatch ? "Пароли не совпадают" : null;

  const isSubmitDisabled =
    newPassword.length === 0 || confirmPassword.length === 0 || !isPasswordsMatch;

  return (
    <Styled.FormPaper elevation={3} $isMobile={isMobile}>
      <Styled.HeaderBox $isMobile={isMobile}>
        <Styled.TitleTypography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
          Установка нового пароля
        </Styled.TitleTypography>
      </Styled.HeaderBox>

      {(tokenStatus === "idle" || tokenStatus === "checking") && (
        <Styled.StatusBox>
          <Typography variant="body2" color="text.secondary">
            Проверяем ссылку...
          </Typography>
        </Styled.StatusBox>
      )}

      {(tokenStatus === "invalid_unknown" ||
        tokenStatus === "invalid_expired" ||
        tokenStatus === "invalid_used") && (
        <Styled.StatusBox>
          <Alert severity="error">{tokenError ?? "Ссылка для сброса пароля недействительна"}</Alert>
          <Styled.RouterLink to="/forgot-password">
            <Button fullWidth variant="contained" size={isMobile ? "medium" : "large"}>
              Запросить новую ссылку
            </Button>
          </Styled.RouterLink>
          <Styled.RouterLink to="/login">
            <Button fullWidth variant="text" size={isMobile ? "medium" : "large"}>
              Отмена
            </Button>
          </Styled.RouterLink>
        </Styled.StatusBox>
      )}

      {tokenStatus === "valid" && !isSuccess && (
        <>
          <TextField
            fullWidth
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => actions.newPasswordChanged(e.target.value)}
            margin="normal"
            required
            autoFocus
            size={isMobile ? "small" : "medium"}
            helperText="Минимум 8 символов, заглавные и строчные буквы, цифра"
          />
          <TextField
            fullWidth
            label="Подтверждение пароля"
            type="password"
            value={confirmPassword}
            onChange={(e) => actions.confirmPasswordChanged(e.target.value)}
            margin="normal"
            required
            size={isMobile ? "small" : "medium"}
            error={!isPasswordsMatch}
            helperText={mismatchMessage ?? " "}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Styled.ActionsBox>
            <Button
              fullWidth
              variant="contained"
              size={isMobile ? "medium" : "large"}
              disabled={isSubmitDisabled}
              onClick={() => actions.formSubmitted()}
            >
              Сохранить
            </Button>
          </Styled.ActionsBox>
        </>
      )}

      {isSuccess && (
        <Styled.StatusBox>
          <Alert severity="success">Пароль успешно изменён</Alert>
          <Styled.RouterLink to="/login">
            <Button fullWidth variant="contained" size={isMobile ? "medium" : "large"}>
              Войти с новым паролем
            </Button>
          </Styled.RouterLink>
        </Styled.StatusBox>
      )}
    </Styled.FormPaper>
  );
};
