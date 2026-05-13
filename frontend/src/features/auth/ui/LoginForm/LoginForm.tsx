import type { FC, KeyboardEvent } from "react";

import { Typography, Alert, useMediaQuery, useTheme } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { TextField, Button } from "@shared";

import * as Styled from "./LoginForm.styled";
import { loginFormModel } from "../../models";

export const LoginForm: FC = () => {
  useGate(loginFormModel.LoginFormGate);

  const email = useUnit(loginFormModel.$email);
  const password = useUnit(loginFormModel.$password);

  const isLoading = useUnit(loginFormModel.$isLoading);
  const authError = useUnit(loginFormModel.$loginError);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSubmit = () => {
    if (!email || !password) {
      return;
    }
    loginFormModel.submitLogin({ email, password });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Styled.FormPaper elevation={3} $isMobile={isMobile}>
      <Styled.HeaderBox $isMobile={isMobile}>
        <Styled.EmojiTypography variant={isMobile ? "h4" : "h3"} component="h1" gutterBottom>
          🎓
        </Styled.EmojiTypography>
        <Styled.TitleTypography variant={isMobile ? "h5" : "h4"} component="h2" gutterBottom>
          Добро пожаловать!
        </Styled.TitleTypography>
        <Typography variant={isMobile ? "body2" : "body1"} color="text.secondary">
          Войдите в ваш аккаунт Kaluger Tutor
        </Typography>
      </Styled.HeaderBox>

      <Styled.FieldsBox onKeyDown={handleKeyDown}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            loginFormModel.emailChanged(e.target.value);
            if (authError) {
              loginFormModel.$loginError.reinit();
            }
          }}
          margin="normal"
          required
          autoFocus
          size={isMobile ? "small" : "medium"}
        />

        <TextField
          fullWidth
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => {
            loginFormModel.passwordChanged(e.target.value);
            if (authError) {
              loginFormModel.$loginError.reinit();
            }
          }}
          margin="normal"
          required
          size={isMobile ? "small" : "medium"}
        />

        <Styled.ForgotPasswordRow>
          <Styled.ForgotPasswordLink to="/forgot-password">
            Забыли пароль?
          </Styled.ForgotPasswordLink>
        </Styled.ForgotPasswordRow>

        {authError && <Alert severity="error">{authError}</Alert>}

        <Styled.SubmitButton
          fullWidth
          variant="contained"
          size={isMobile ? "medium" : "large"}
          disabled={isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? "Вход..." : "Войти"}
        </Styled.SubmitButton>

        <Styled.RegisterLink to="/register">
          <Button fullWidth variant="text" size={isMobile ? "medium" : "large"}>
            Нет аккаунта? Зарегистрироваться
          </Button>
        </Styled.RegisterLink>
      </Styled.FieldsBox>
    </Styled.FormPaper>
  );
};
