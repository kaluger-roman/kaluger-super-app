import type { FC, FormEvent } from "react";

import { useMediaQuery, useTheme } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { useRegisterForm } from "./RegisterForm.hooks";
import * as Styled from "./RegisterForm.styled";
import { RegisterFormActions } from "./RegisterFormActions";
import { RegisterFormFields } from "./RegisterFormFields";
import { RegisterFormHeader } from "./RegisterFormHeader";
import { registerFormModel } from "../../models";

export const RegisterForm: FC = () => {
  useGate(registerFormModel.RegisterFormGate);

  const { formData, setters, validation } = useRegisterForm();
  const { validationError, validateForm, clearValidationError } = validation;

  const isLoading = useUnit(registerFormModel.$isLoading);
  const authError = useUnit(registerFormModel.$registerError);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    registerFormModel.submitRegister({
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
