import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Alert,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
      sx={{
        p: isMobile ? 3 : 4,
        width: "100%",
        maxWidth: 440,
        borderRadius: 3,
        maxHeight: isMobile ? "90vh" : "auto",
        overflow: "auto",
      }}
    >
      <Box textAlign="center" mb={isMobile ? 2 : 3}>
        <Typography
          variant={isMobile ? "h4" : "h3"}
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          🎓
        </Typography>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          component="h2"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          Создать аккаунт
        </Typography>
        <Typography
          variant={isMobile ? "body2" : "body1"}
          color="text.secondary"
        >
          Зарегистрируйтесь в Kaluger Tutor
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Имя"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setValidationError("");
            if (authError) {
              clearAuthError();
            }
          }}
          margin="normal"
          required
          autoFocus
          size={isMobile ? "small" : "medium"}
        />

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setValidationError("");
            if (authError) {
              clearAuthError();
            }
          }}
          margin="normal"
          required
          size={isMobile ? "small" : "medium"}
        />

        <TextField
          fullWidth
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setValidationError("");
            if (authError) {
              clearAuthError();
            }
          }}
          margin="normal"
          required
          size={isMobile ? "small" : "medium"}
        />

        <TextField
          fullWidth
          label="Подтвердите пароль"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setValidationError("");
            if (authError) {
              clearAuthError();
            }
          }}
          margin="normal"
          required
          size={isMobile ? "small" : "medium"}
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
          size={isMobile ? "medium" : "large"}
          sx={{
            mt: isMobile ? 2 : 3,
            py: isMobile ? 1 : 1.5,
            fontWeight: 600,
          }}
          disabled={isLoading}
        >
          {isLoading ? "Регистрация..." : "Зарегистрироваться"}
        </Button>

        <Button
          fullWidth
          variant="text"
          size={isMobile ? "medium" : "large"}
          sx={{
            mt: isMobile ? 1 : 2,
            color: "text.secondary",
            fontSize: isMobile ? "0.875rem" : "1rem",
          }}
          onClick={() => navigate("/login")}
        >
          Уже есть аккаунт? Войти
        </Button>
      </form>
    </Paper>
  );
};
