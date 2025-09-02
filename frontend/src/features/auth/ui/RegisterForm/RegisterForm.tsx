import React, { useEffect } from "react";
import { Paper, useMediaQuery, useTheme } from "@mui/material";
import { useStore } from "effector-react";
import { useNavigate } from "react-router-dom";
import {
  registerUser,
  $userIsLoading,
  $authError,
  $isAuthenticated,
  clearAuthError,
} from "../../../../entities";
import { useRegisterForm } from "./useRegisterForm";
import { RegisterFormHeader } from "./RegisterFormHeader";
import { RegisterFormFields } from "./RegisterFormFields";
import { RegisterFormActions } from "./RegisterFormActions";

export const RegisterForm: React.FC = () => {
  const { formData, setters, validation } = useRegisterForm();
  const { validationError, validateForm, clearValidationError } = validation;

  const isLoading = useStore($userIsLoading);
  const authError = useStore($authError);
  const isAuthenticated = useStore($isAuthenticated);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    clearAuthError();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
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
      <RegisterFormHeader isMobile={isMobile} />

      <form onSubmit={handleSubmit}>
        <RegisterFormFields
          formData={formData}
          setters={setters}
          isMobile={isMobile}
          authError={authError}
          onClearValidationError={clearValidationError}
        />

        <RegisterFormActions
          validationError={validationError}
          authError={authError}
          isLoading={isLoading}
          isMobile={isMobile}
        />
      </form>
    </Paper>
  );
};
