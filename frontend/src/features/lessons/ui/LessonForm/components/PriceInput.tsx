import React, { useRef } from "react";
import { TextField } from "@mui/material";
import { useStore } from "effector-react";
import { $students } from "../../../../../entities/student";
import type { LessonFormData } from "../types";
import { useDisableNumberScroll } from "../../../../../shared";

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
  const students = useStore($students);
  const selectedStudent = students.find((s) => s.id === formData.studentId);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useDisableNumberScroll(inputRef);

  return (
    <TextField
      label="Стоимость урока (₽)"
      type="number"
      value={formData.price}
      onChange={onChange("price")}
      error={!!errors.price}
      helperText={errors.price}
      placeholder={selectedStudent?.hourlyRate?.toString()}
      fullWidth
      disabled={isLoading}
      size={isMobile ? "small" : "medium"}
      inputRef={inputRef}
    />
  );
};
