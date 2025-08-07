import React, { useState, useEffect } from "react";
import { Paper, Typography, Alert, Box } from "@mui/material";
import { useStore } from "effector-react";
import { useNavigate } from "react-router-dom";
import { TextField, Button } from "../../../shared";
import {
  loginUser,
  $userIsLoading,
  $authError,
  $isAuthenticated,
  clearAuthError,
} from "../../../entities";

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLoading = useStore($userIsLoading);
  const authError = useStore($authError);
  const isAuthenticated = useStore($isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear auth error when component mounts
    clearAuthError();
  }, []);

  // Redirect after successful login
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = sessionStorage.getItem("redirectAfterLogin") || "/";
      sessionStorage.removeItem("redirectAfterLogin");
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    loginUser({ email, password });
  };

  return (
    <Paper
      elevation={3}
      sx={{ p: 4, width: "100%", maxWidth: 440, borderRadius: 3 }}
    >
      <Box textAlign="center" mb={3}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          🎓
        </Typography>
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          Добро пожаловать!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Войдите в ваш аккаунт Kaluger Tutor
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
          autoFocus
        />

        <TextField
          fullWidth
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
        />

        {authError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {authError}
          </Alert>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 3, py: 1.5, fontWeight: 600 }}
          disabled={isLoading}
        >
          {isLoading ? "Вход..." : "Войти"}
        </Button>

        <Button
          fullWidth
          variant="text"
          size="large"
          sx={{ mt: 2, color: "text.secondary" }}
          onClick={() => navigate("/register")}
        >
          Нет аккаунта? Зарегистрироваться
        </Button>
      </form>
    </Paper>
  );
};
