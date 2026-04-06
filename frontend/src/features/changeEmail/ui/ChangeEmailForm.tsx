import type { FC, KeyboardEvent, ClipboardEvent } from "react";
import { useRef } from "react";

import { TextField, Alert } from "@mui/material";
import { useUnit } from "effector-react";

import { userModel } from "@entities";
import { Button } from "@shared";

import { changeEmailModel } from "../models";
import * as Styled from "./ChangeEmailForm.styled";

const CODE_LENGTH = 6;

export const ChangeEmailForm: FC = () => {
  const user = useUnit(userModel.$user);
  const newEmail = useUnit(changeEmailModel.$newEmail);
  const password = useUnit(changeEmailModel.$password);
  const code = useUnit(changeEmailModel.$code);
  const error = useUnit(changeEmailModel.$error);
  const isLoading = useUnit(changeEmailModel.$isLoading);
  const isCodeStep = useUnit(changeEmailModel.$isCodeStep);
  const canResend = useUnit(changeEmailModel.$canResend);
  const resendTimer = useUnit(changeEmailModel.$resendTimer);

  const actions = useUnit({
    newEmailChanged: changeEmailModel.newEmailChanged,
    passwordChanged: changeEmailModel.passwordChanged,
    codeChanged: changeEmailModel.codeChanged,
    initiateSubmitted: changeEmailModel.initiateSubmitted,
    verifySubmitted: changeEmailModel.verifySubmitted,
    resendRequested: changeEmailModel.resendRequested,
    cancelRequested: changeEmailModel.cancelRequested,
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!user) return null;

  const isInitiateFormValid = newEmail.length > 0 && password.length > 0;

  const codeArray = code
    .padEnd(CODE_LENGTH, " ")
    .split("")
    .slice(0, CODE_LENGTH);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = codeArray
      .map((char, i) => (i === index ? value.slice(-1) : char))
      .join("")
      .trim();
    actions.codeChanged(newCode);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeArray[index].trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    actions.codeChanged(pastedData);

    const nextEmptyIndex = Math.min(pastedData.length, CODE_LENGTH - 1);
    inputRefs.current[nextEmptyIndex]?.focus();
  };

  if (isCodeStep) {
    return (
      <Styled.SectionPaper elevation={0}>
        <Styled.SectionTitle variant="h6">Подтверждение смены email</Styled.SectionTitle>

        <Styled.InfoText variant="body2">
          Код верификации отправлен на <strong>{newEmail}</strong>
        </Styled.InfoText>

        <Styled.CodeInputContainer>
          {codeArray.map((digit, index) => (
            <Styled.CodeInput
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit.trim()}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isLoading}
              $hasError={!!error}
              autoFocus={index === 0}
            />
          ))}
        </Styled.CodeInputContainer>

        {error && (
          <Styled.ErrorAlertTop>
            <Alert severity="error">{error}</Alert>
          </Styled.ErrorAlertTop>
        )}

        <Styled.ButtonBox>
          <Button
            variant="text"
            onClick={actions.resendRequested}
            disabled={!canResend || isLoading}
          >
            {!canResend ? `Отправить снова (${resendTimer}с)` : "Отправить код повторно"}
          </Button>
          <Button
            variant="outlined"
            onClick={actions.cancelRequested}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={actions.verifySubmitted}
            disabled={code.length !== CODE_LENGTH || isLoading}
          >
            {isLoading ? "Проверка..." : "Подтвердить"}
          </Button>
        </Styled.ButtonBox>
      </Styled.SectionPaper>
    );
  }

  return (
    <Styled.SectionPaper elevation={0}>
      <Styled.SectionTitle variant="h6">Смена email</Styled.SectionTitle>

      <Styled.CurrentEmailText variant="body2">
        Текущий email: <strong>{user.email}</strong>
      </Styled.CurrentEmailText>

      <Styled.FieldsBox>
        <TextField
          fullWidth
          type="email"
          label="Новый email"
          value={newEmail}
          onChange={(e) => actions.newEmailChanged(e.target.value)}
          disabled={isLoading}
        />
        <TextField
          fullWidth
          type="password"
          label="Текущий пароль"
          value={password}
          onChange={(e) => actions.passwordChanged(e.target.value)}
          disabled={isLoading}
          helperText="Введите пароль для подтверждения"
        />
      </Styled.FieldsBox>

      {error && (
        <Styled.ErrorAlertBottom>
          <Alert severity="error">{error}</Alert>
        </Styled.ErrorAlertBottom>
      )}

      <Styled.ButtonBox>
        <Button
          variant="contained"
          onClick={actions.initiateSubmitted}
          disabled={!isInitiateFormValid || isLoading}
        >
          {isLoading ? "Отправка..." : "Сменить email"}
        </Button>
      </Styled.ButtonBox>
    </Styled.SectionPaper>
  );
};
