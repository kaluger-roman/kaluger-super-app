import { useState } from "react";
import type { FC } from "react";

import { TextField } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./AdminLogin.styled";
import * as adminModel from "../../models/admin.model";

export const AdminLogin: FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginError = useUnit(adminModel.$loginError);
  const isLoading = useUnit(adminModel.loginFx.pending);
  const actions = useUnit({ login: adminModel.loginSubmitted });

  const handleLogin = () => {
    actions.login({ email, password });
  };

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
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          onClick={handleLogin}
        >
          {isLoading ? "Вход..." : "Войти"}
        </Styled.StyledButton>
      </Styled.StyledPaper>
    </Styled.StyledWrapper>
  );
};
