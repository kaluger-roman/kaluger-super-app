import React from "react";
import { TextField } from "../../../../shared";
import { clearAuthError } from "../../../../entities";

type RegisterFormFieldsProps = {
  formData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  setters: {
    setName: (value: string) => void;
    setEmail: (value: string) => void;
    setPassword: (value: string) => void;
    setConfirmPassword: (value: string) => void;
  };
  isMobile: boolean;
  authError: string | null;
  onClearValidationError: () => void;
};

export const RegisterFormFields = ({
  formData,
  setters,
  isMobile,
  authError,
  onClearValidationError,
}: RegisterFormFieldsProps) => {
  const handleFieldChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    onClearValidationError();
    if (authError) {
      clearAuthError();
    }
  };

  return (
    <>
      <TextField
        fullWidth
        label="Имя"
        value={formData.name}
        onChange={handleFieldChange(setters.setName)}
        margin="normal"
        required
        autoFocus
        size={isMobile ? "small" : "medium"}
      />

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleFieldChange(setters.setEmail)}
        margin="normal"
        required
        size={isMobile ? "small" : "medium"}
      />

      <TextField
        fullWidth
        label="Пароль"
        type="password"
        value={formData.password}
        onChange={handleFieldChange(setters.setPassword)}
        margin="normal"
        required
        size={isMobile ? "small" : "medium"}
      />

      <TextField
        fullWidth
        label="Подтвердите пароль"
        type="password"
        value={formData.confirmPassword}
        onChange={handleFieldChange(setters.setConfirmPassword)}
        margin="normal"
        required
        size={isMobile ? "small" : "medium"}
      />
    </>
  );
};
