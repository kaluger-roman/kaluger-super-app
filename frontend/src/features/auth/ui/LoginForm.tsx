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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
          Добро пожаловать!
        </Typography>
        <Typography
          variant={isMobile ? "body2" : "body1"}
          color="text.secondary"
        >
          Войдите в ваш аккаунт Kaluger Tutor
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            // Очищаем ошибку при изменении формы
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
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            // Очищаем ошибку при изменении формы
            if (authError) {
              clearAuthError();
            }
          }}
          margin="normal"
          required
          size={isMobile ? "small" : "medium"}
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
          size={isMobile ? "medium" : "large"}
          sx={{
            mt: isMobile ? 2 : 3,
            py: isMobile ? 1 : 1.5,
            fontWeight: 600,
          }}
          disabled={isLoading}
        >
          {isLoading ? "Вход..." : "Войти"}
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
          onClick={() => navigate("/register")}
        >
          Нет аккаунта? Зарегистрироваться
        </Button>
      </form>
    </Paper>
  );
};
