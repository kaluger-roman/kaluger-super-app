import type { FC, KeyboardEvent } from "react";

import {
  Alert,
  ToggleButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { TextField, Button } from "@shared";

import * as Styled from "./LoginForm.styled";
import { studentLoginModel } from "../../../studentAuth";
import { loginFormModel } from "../../models";

export const LoginForm: FC = () => {
  useGate(loginFormModel.LoginFormGate);

  const email = useUnit(loginFormModel.$email);
  const password = useUnit(loginFormModel.$password);
  const loginRole = useUnit(loginFormModel.$loginRole);

  const tutorLoading = useUnit(loginFormModel.$isLoading);
  const studentLoading = useUnit(studentLoginModel.$isLoggingIn);
  const isLoading = tutorLoading || studentLoading;

  const tutorError = useUnit(loginFormModel.$loginError);
  const studentError = useUnit(studentLoginModel.$studentLoginError);
  const authError = loginRole === "tutor" ? tutorError : studentError;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSubmit = () => {
    if (!email || !password) {
      return;
    }
    if (loginRole === "tutor") {
      loginFormModel.submitLogin({ email, password });
    } else {
      studentLoginModel.studentLoginRequested({ email, password });
    }
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

      <Styled.RoleToggleGroup
        value={loginRole}
        exclusive
        onChange={(_e, value) => {
          if (value === "tutor" || value === "student") {
            loginFormModel.loginRoleToggled(value);
          }
        }}
        fullWidth
        size={isMobile ? "small" : "medium"}
      >
        <ToggleButton value="tutor">Преподаватель</ToggleButton>
        <ToggleButton value="student">Ученик</ToggleButton>
      </Styled.RoleToggleGroup>

      <Styled.FieldsBox onKeyDown={handleKeyDown}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => loginFormModel.emailChanged(e.target.value)}
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
          onChange={(e) => loginFormModel.passwordChanged(e.target.value)}
          margin="normal"
          required
          size={isMobile ? "small" : "medium"}
        />

        {loginRole === "tutor" && (
          <Styled.ForgotPasswordRow>
            <Styled.ForgotPasswordLink to="/forgot-password">
              Забыли пароль?
            </Styled.ForgotPasswordLink>
          </Styled.ForgotPasswordRow>
        )}

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

        {loginRole === "tutor" ? (
          <Styled.RegisterLink to="/register">
            <Button fullWidth variant="text" size={isMobile ? "medium" : "large"}>
              Нет аккаунта? Зарегистрироваться
            </Button>
          </Styled.RegisterLink>
        ) : (
          <Typography variant="caption" color="text.secondary" align="center" component="div">
            Ученики регистрируются по ссылке от преподавателя.
          </Typography>
        )}
      </Styled.FieldsBox>
    </Styled.FormPaper>
  );
};
