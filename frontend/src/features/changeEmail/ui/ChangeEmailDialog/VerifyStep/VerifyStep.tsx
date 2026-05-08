import type { FC, KeyboardEvent, ClipboardEvent } from "react";
import { useRef } from "react";

import { Typography, Box } from "@mui/material";
import { useUnit } from "effector-react";

import { changeEmailModel } from "../../../models";
import { CODE_LENGTH } from "../ChangeEmailDialog.constants";
import * as Styled from "../ChangeEmailDialog.styled";

export const VerifyStep: FC = () => {
  const newEmail = useUnit(changeEmailModel.$newEmail);
  const code = useUnit(changeEmailModel.$code);
  const error = useUnit(changeEmailModel.$error);

  const actions = useUnit({
    codeChanged: changeEmailModel.codeChanged,
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
    <Box display="flex" flexDirection="column" gap={2}>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Код верификации отправлен на <strong>{newEmail}</strong>
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
            $hasError={!!error}
            autoFocus={index === 0}
          />
        ))}
      </Styled.CodeInputContainer>
    </Box>
  );
};
