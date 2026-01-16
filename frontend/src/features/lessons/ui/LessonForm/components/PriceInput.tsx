import type { FC } from "react";
import { useMemo, useRef } from "react";

import { TextField } from "@mui/material";
import { useUnit } from "effector-react";

import { studentModel } from "@entities";
import { useDisableNumberScroll } from "@shared";

import type { LessonFormData } from "../types";

type PriceInputProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onChange: (field: string) => (e: { target?: { value: unknown } } | unknown) => void;
};

export const PriceInput: FC<PriceInputProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onChange,
}) => {
  const activeStudents = useUnit(studentModel.$students);
  const archivedStudents = useUnit(studentModel.$archivedStudents);

  const selectedStudent = useMemo(
    () => [...activeStudents, ...archivedStudents].find((s) => s.id === formData.studentId),
    [activeStudents, archivedStudents, formData.studentId]
  );

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
