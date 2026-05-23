import type { FC } from "react";

import { Alert, Button, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./StudentEmailVerificationForm.styled";
import { studentEmailVerificationModel } from "../../models";

export const StudentEmailVerificationForm: FC = () => {
  const code = useUnit(studentEmailVerificationModel.$code);
  const verifyError = useUnit(studentEmailVerificationModel.$verifyError);
  const resendError = useUnit(studentEmailVerificationModel.$resendError);
  const cooldown = useUnit(
    studentEmailVerificationModel.$resendCooldownSeconds
  );
  const isVerifying = useUnit(studentEmailVerificationModel.$isVerifying);
  const isResending = useUnit(studentEmailVerificationModel.$isResending);

  const handleSubmit = () => {
    studentEmailVerificationModel.codeSubmitted();
  };

  const handleResend = () => {
    studentEmailVerificationModel.resendRequested();
  };

  return (
    <Styled.Wrapper variant="outlined">
      <Typography variant="subtitle1" fontWeight={600}>
        Подтверждение email
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Введите 6-значный код, отправленный на ваш email.
      </Typography>
      {verifyError && <Alert severity="error">{verifyError}</Alert>}
      {resendError && <Alert severity="warning">{resendError}</Alert>}
      <Styled.Row>
        <Styled.CodeField
          label="Код"
          value={code}
          onChange={(e) =>
            studentEmailVerificationModel.codeChanged(e.target.value)
          }
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
          size="small"
        />
        <Button
          variant="contained"
          disabled={isVerifying}
          onClick={handleSubmit}
        >
          {isVerifying ? "Проверяем…" : "Подтвердить"}
        </Button>
        <Button
          variant="text"
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
        >
          {cooldown > 0
            ? `Отправить заново через ${cooldown}с`
            : "Отправить заново"}
        </Button>
      </Styled.Row>
    </Styled.Wrapper>
  );
};
