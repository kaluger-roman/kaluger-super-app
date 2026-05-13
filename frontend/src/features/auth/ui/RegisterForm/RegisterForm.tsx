import type { FC, KeyboardEvent } from "react";

import { Box, useMediaQuery, useTheme } from "@mui/material";
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

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    registerFormModel.submitRegister({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Styled.StyledPaper elevation={3} $isMobile={isMobile}>
      <RegisterFormHeader isMobile={isMobile} />

      <Box onKeyDown={handleKeyDown}>
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
          onSubmit={handleSubmit}
        />
      </Box>
    </Styled.StyledPaper>
  );
};
