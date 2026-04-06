import type { FC, KeyboardEvent, ClipboardEvent } from "react";
import { useRef } from "react";

import { Alert } from "@mui/material";
import { useUnit } from "effector-react";

import { Button } from "@shared";

import { changeEmailModel } from "../models";
import * as Styled from "./ChangeEmailForm.styled";

const CODE_LENGTH = 6;

export const VerifyCodeForm: FC = () => {
  const newEmail = useUnit(changeEmailModel.$newEmail);
  const code = useUnit(changeEmailModel.$code);
  const error = useUnit(changeEmailModel.$error);
  const canResend = useUnit(changeEmailModel.$canResend);
  const resendTimer = useUnit(changeEmailModel.$resendTimer);

  const actions = useUnit({
    codeChanged: changeEmailModel.codeChanged,
    verifySubmitted: changeEmailModel.verifySubmitted,
    resendRequested: changeEmailModel.resendRequested,
    cancelRequested: changeEmailModel.cancelRequested,
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
          disabled={!canResend}
        >
          {!canResend ? `Отправить снова (${resendTimer}с)` : "Отправить код повторно"}
        </Button>
        <Button variant="outlined" onClick={actions.cancelRequested}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={actions.verifySubmitted}
          disabled={code.length !== CODE_LENGTH}
        >
          Подтвердить
        </Button>
      </Styled.ButtonBox>
    </Styled.SectionPaper>
  );
};
