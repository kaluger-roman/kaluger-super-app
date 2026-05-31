import type { FC } from "react";

import { TextField } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./AdminLogin.styled";
import { adminAuthModel } from "../../models";

export const AdminLogin: FC = () => {
  const email = useUnit(adminAuthModel.$email);
  const password = useUnit(adminAuthModel.$password);
  const loginError = useUnit(adminAuthModel.$loginError);
  const isLoginPending = useUnit(adminAuthModel.loginFx.pending);
  const actions = useUnit({
    login: adminAuthModel.loginSubmitted,
    changeEmail: adminAuthModel.emailChanged,
    changePassword: adminAuthModel.passwordChanged,
  });

  return (
    <Styled.StyledWrapper>
      <Styled.StyledPaper elevation={3}>
        <Styled.StyledTitle variant="h5">
          Админ-панель
        </Styled.StyledTitle>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => actions.changeEmail(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => actions.changePassword(e.target.value)}
          margin="normal"
        />
        {loginError && (
          <Styled.StyledAlert severity="error">
            {loginError}
          </Styled.StyledAlert>
        )}
        <Styled.StyledButton
          fullWidth
          variant="contained"
          onClick={() => actions.login()}
          disabled={isLoginPending}
        >
          {isLoginPending ? "Вход..." : "Войти"}
        </Styled.StyledButton>
      </Styled.StyledPaper>
    </Styled.StyledWrapper>
  );
};
