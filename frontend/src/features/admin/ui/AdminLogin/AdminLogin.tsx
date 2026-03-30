import type { FC } from "react";

import { TextField } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./AdminLogin.styled";
import { adminModel } from "../../models";

export const AdminLogin: FC = () => {
  const email = useUnit(adminModel.$email);
  const password = useUnit(adminModel.$password);
  const loginError = useUnit(adminModel.$loginError);
  const isLoading = useUnit(adminModel.loginFx.pending);
  const actions = useUnit({
    login: adminModel.loginSubmitted,
    changeEmail: adminModel.emailChanged,
    changePassword: adminModel.passwordChanged,
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
          disabled={isLoading}
          onClick={() => actions.login()}
        >
          {isLoading ? "Вход..." : "Войти"}
        </Styled.StyledButton>
      </Styled.StyledPaper>
    </Styled.StyledWrapper>
  );
};
