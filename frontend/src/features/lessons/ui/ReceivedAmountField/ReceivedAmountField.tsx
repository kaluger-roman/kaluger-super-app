import type { FC } from "react";
import { useRef } from "react";

import { InputAdornment, TextField } from "@mui/material";

import { useDisableNumberScroll } from "@shared";

import { RECEIVED_AMOUNT_LABEL } from "./ReceivedAmountField.constants";

type ReceivedAmountFieldProps = {
  value: string;
  error?: string | null;
  helperText?: string;
  disabled?: boolean;
  size?: "small" | "medium";
  onChange: (value: string) => void;
};

export const ReceivedAmountField: FC<ReceivedAmountFieldProps> = ({
  value,
  error,
  helperText,
  disabled,
  size = "medium",
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useDisableNumberScroll(inputRef);

  return (
    <TextField
      label={RECEIVED_AMOUNT_LABEL}
      type="number"
      fullWidth
      margin="dense"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)}
      helperText={error ?? helperText}
      disabled={disabled}
      size={size}
      inputRef={inputRef}
      InputLabelProps={{ shrink: true }}
      InputProps={{ endAdornment: <InputAdornment position="end">₽</InputAdornment> }}
      inputProps={{ min: 0, step: "0.01", inputMode: "decimal" }}
    />
  );
};
