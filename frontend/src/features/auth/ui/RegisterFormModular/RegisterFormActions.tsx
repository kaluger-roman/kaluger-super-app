import React from "react";
import { Alert, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

type RegisterFormActionsProps = {
  validationError: string;
  authError: string | null;
  isLoading: boolean;
  isMobile: boolean;
};

export const RegisterFormActions = ({
  validationError,
  authError,
  isLoading,
  isMobile,
}: RegisterFormActionsProps) => {
  const navigate = useNavigate();

  return (
    <>
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
    </>
  );
};
