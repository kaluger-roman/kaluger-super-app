import type { ChangeEvent, FC } from "react";
import { useRef } from "react";

import { Handshake as HandshakeIcon } from "@mui/icons-material";
import { InputAdornment, TextField } from "@mui/material";

import { useDisableNumberScroll } from "@shared";

import {
  COMMISSION_ERROR_TEXTS,
  COMMISSION_HELPER_TEXT,
  MAX_COMMISSION_AMOUNT,
  getCommissionError,
} from "../../../models";

type CommissionFieldProps = {
  value: string;
  isMobile: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

export const CommissionField: FC<CommissionFieldProps> = ({ value, isMobile, onChange }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useDisableNumberScroll(inputRef);

  const errorReason = getCommissionError(value);

  return (
    <TextField
      label="Комиссия"
      type="number"
      inputRef={inputRef}
      value={value}
      onChange={onChange}
      fullWidth
      error={errorReason !== null}
      helperText={errorReason ? COMMISSION_ERROR_TEXTS[errorReason] : COMMISSION_HELPER_TEXT}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <HandshakeIcon fontSize="small" color="action" />
          </InputAdornment>
        ),
        endAdornment: <InputAdornment position="end">₽</InputAdornment>,
      }}
      inputProps={{ min: 0, max: MAX_COMMISSION_AMOUNT, step: 0.01 }}
      placeholder="0"
      size={isMobile ? "small" : "medium"}
    />
  );
};
