import type { FC, KeyboardEvent, ClipboardEvent } from "react";
import { useRef } from "react";

import { Typography, Alert, useMediaQuery, useTheme } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { verificationModel, userModel } from "@entities";
import { Button, EMAIL_VERIFICATION_CODE_LENGTH } from "@shared";

import * as Styled from "./EmailVerificationForm.styled";

export const EmailVerificationForm: FC = () => {
  useGate(verificationModel.VerificationGate);

  const verificationCode = useUnit(verificationModel.$verificationCode);
  const canResend = useUnit(verificationModel.$canResend);
  const resendTimer = useUnit(verificationModel.$resendTimer);
  const isLoading = useUnit(verificationModel.$verificationIsLoading);
  const authError = useUnit(verificationModel.$verificationError);
  const email = useUnit(verificationModel.$verificationEmail);

  const actions = useUnit({
    codeChanged: verificationModel.codeChanged,
    verifyCode: verificationModel.verifyCode,
    resendCode: verificationModel.resendCode,
    logout: userModel.logoutUser,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!email) return null;

  const codeArray = verificationCode
    .padEnd(EMAIL_VERIFICATION_CODE_LENGTH, " ")
    .split("")
    .slice(0, EMAIL_VERIFICATION_CODE_LENGTH);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = codeArray
      .map((char, i) => (i === index ? value.slice(-1) : char))
      .join("")
      .trim();
    actions.codeChanged(newCode);

    if (value && index < EMAIL_VERIFICATION_CODE_LENGTH - 1) {
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
      .slice(0, EMAIL_VERIFICATION_CODE_LENGTH);
    actions.codeChanged(pastedData);

    const nextEmptyIndex = Math.min(pastedData.length, EMAIL_VERIFICATION_CODE_LENGTH - 1);
    inputRefs.current[nextEmptyIndex]?.focus();
  };

  return (
    <Styled.Container>
      <Styled.StyledPaper elevation={3} $isMobile={isMobile}>
        <Styled.IconBox>📧</Styled.IconBox>

        <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
          Подтверждение Email
        </Typography>

        <Typography variant="body2" color="text.secondary" component="p">
          Мы отправили код подтверждения на
        </Typography>

        <Typography variant="body1" fontWeight="bold" gutterBottom>
          {email}
        </Typography>

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
              $hasError={!!authError}
              autoFocus={index === 0}
            />
          ))}
        </Styled.CodeInputContainer>

        {authError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {authError}
          </Alert>
        )}

        <Styled.ActionsBox>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={actions.verifyCode}
            disabled={isLoading || verificationCode.length !== EMAIL_VERIFICATION_CODE_LENGTH}
          >
            {isLoading ? "Проверка..." : "Подтвердить"}
          </Button>

          <Button
            fullWidth
            variant="text"
            size="medium"
            onClick={actions.resendCode}
            disabled={!canResend || isLoading}
          >
            {!canResend ? `Отправить снова (${resendTimer}с)` : "Отправить код повторно"}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            size="medium"
            onClick={actions.logout}
            disabled={isLoading}
          >
            Выйти
          </Button>
        </Styled.ActionsBox>
      </Styled.StyledPaper>
    </Styled.Container>
  );
};
