import type { FC, FormEvent } from "react";
import { useEffect } from "react";

import { useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";
import { useNavigate } from "react-router-dom";

import { userModel } from "@entities";

import { useRegisterForm } from "./RegisterForm.hooks";
import * as Styled from "./RegisterForm.styled";
import { RegisterFormActions } from "./RegisterFormActions";
import { RegisterFormFields } from "./RegisterFormFields";
import { RegisterFormHeader } from "./RegisterFormHeader";

export const RegisterForm: FC = () => {
  const { formData, setters, validation } = useRegisterForm();
  const { validationError, validateForm, clearValidationError } = validation;

  const isLoading = useUnit(userModel.$isLoading);
  const authError = useUnit(userModel.$authError);
  const isAuthenticated = useUnit(userModel.$isAuthenticated);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    userModel.clearAuthError();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    userModel.registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
  };

  return (
    <Styled.StyledPaper elevation={3} $isMobile={isMobile}>
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
    </Styled.StyledPaper>
  );
};
