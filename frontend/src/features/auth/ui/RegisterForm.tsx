import React, { useState, useEffect } from "react";
import { Paper, Typography, Alert, Box } from "@mui/material";
import { useStore } from "effector-react";
import { useNavigate } from "react-router-dom";
import { TextField, Button, validateEmail } from "../../../shared";
import {
  registerUser,
  $userIsLoading,
  $authError,
  $isAuthenticated,
  clearAuthError,
} from "../../../entities";

export const RegisterForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const isLoading = useStore($userIsLoading);
  const authError = useStore($authError);
  const isAuthenticated = useStore($isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear auth error when component mounts
    clearAuthError();
  }, []);

  // Redirect after successful registration
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!name || !email || !password || !confirmPassword) {
      setValidationError("Заполните все поля");
      return;
    }

    if (!validateEmail(email)) {
      setValidationError("Введите корректный email");
      return;
    }

    if (password.length < 8) {
      setValidationError("Пароль должен содержать минимум 8 символов");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Пароли не совпадают");
      return;
    }

    registerUser({ name, email, password });
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
          Создать аккаунт
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Зарегистрируйтесь в Kaluger Tutor
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          required
          autoFocus
        />

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
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

        <TextField
          fullWidth
          label="Подтвердите пароль"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          margin="normal"
          required
        />

        {(validationError || authError) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {validationError || authError}
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
          {isLoading ? "Регистрация..." : "Зарегистрироваться"}
        </Button>

        <Button
          fullWidth
          variant="text"
          size="large"
          sx={{ mt: 2, color: "text.secondary" }}
          onClick={() => navigate("/login")}
        >
          Уже есть аккаунт? Войти
        </Button>
      </form>
    </Paper>
  );
};
