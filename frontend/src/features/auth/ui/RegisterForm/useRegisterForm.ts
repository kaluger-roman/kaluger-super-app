import { useState } from "react";
import { validateEmail } from "../../../../shared";

type ValidationError = string;

export const useRegisterForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<ValidationError>("");

  const validateForm = (): boolean => {
    setValidationError("");

    if (!name || !email || !password || !confirmPassword) {
      setValidationError("Заполните все поля");
      return false;
    }

    if (!validateEmail(email)) {
      setValidationError("Введите корректный email");
      return false;
    }

    if (password.length < 8) {
      setValidationError("Пароль должен содержать минимум 8 символов");
      return false;
    }

    if (password !== confirmPassword) {
      setValidationError("Пароли не совпадают");
      return false;
    }

    return true;
  };

  const clearValidationError = () => {
    setValidationError("");
  };

  return {
    formData: {
      name,
      email,
      password,
      confirmPassword,
    },
    setters: {
      setName,
      setEmail,
      setPassword,
      setConfirmPassword,
    },
    validation: {
      validationError,
      validateForm,
      clearValidationError,
    },
  };
};
