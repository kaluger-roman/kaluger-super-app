import type { FC, FormEvent } from "react";
import { useEffect } from "react";

import { Typography, Alert, useMediaQuery, useTheme } from "@mui/material";
import { useGate, useUnit } from "effector-react";
import { useNavigate } from "react-router-dom";

import { userModel } from "@entities";
import { TextField, Button } from "@shared";

import * as Styled from "./LoginForm.styled";
import { loginFormModel } from "../../models";

export const LoginForm: FC = () => {
  useGate(loginFormModel.LoginFormGate);

  const email = useUnit(loginFormModel.$email);
  const password = useUnit(loginFormModel.$password);

  const isLoading = useUnit(userModel.$isLoading);
  const authError = useUnit(userModel.$authError);
  const isAuthenticated = useUnit(userModel.$isAuthenticated);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    userModel.clearAuthError();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = sessionStorage.getItem("redirectAfterLogin") || "/";
      sessionStorage.removeItem("redirectAfterLogin");
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    userModel.loginUser({ email, password });
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

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            loginFormModel.emailChanged(e.target.value);
            if (authError) {
              userModel.clearAuthError();
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
              userModel.clearAuthError();
            }
          }}
          margin="normal"
          required
          size={isMobile ? "small" : "medium"}
        />

        {authError && <Alert severity="error">{authError}</Alert>}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size={isMobile ? "medium" : "large"}
          disabled={isLoading}
        >
          {isLoading ? "Вход..." : "Войти"}
        </Button>

        <Button
          fullWidth
          variant="text"
          size={isMobile ? "medium" : "large"}
          onClick={() => navigate("/register")}
        >
          Нет аккаунта? Зарегистрироваться
        </Button>
      </form>
    </Styled.FormPaper>
  );
};
