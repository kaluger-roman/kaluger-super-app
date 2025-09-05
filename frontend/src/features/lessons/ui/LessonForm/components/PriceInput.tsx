import React from "react";
import { TextField } from "@mui/material";
import type { LessonFormData } from "../types";

type PriceInputProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onChange: (field: string) => (e: any) => void;
};

export const PriceInput: React.FC<PriceInputProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onChange,
}) => {
  return (
    <TextField
      label="Стоимость урока (₽)"
      type="number"
      value={formData.price}
      onChange={onChange("price")}
      error={!!errors.price}
      helperText={errors.price}
      fullWidth
      disabled={isLoading}
      size={isMobile ? "small" : "medium"}
    />
  );
};
