import type { FC } from "react";

import { FormControl, InputLabel, Select } from "@mui/material";
import { useUnit } from "effector-react";

import { studentModel } from "@entities";

import * as Styled from "./StudentSelector.styled";
import type { LessonFormData } from "../types";

type StudentSelectorProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onChange: (field: string) => (e: { target?: { value: unknown } } | unknown) => void;
};

export const StudentSelector: FC<StudentSelectorProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onChange,
}) => {
  const students = useUnit(studentModel.$students);

  return (
    <FormControl fullWidth error={!!errors.studentId} size={isMobile ? "small" : "medium"}>
      <InputLabel>Ученик *</InputLabel>
      <Select
        value={formData.studentId}
        onChange={onChange("studentId")}
        label="Ученик *"
        disabled={isLoading}
      >
        {students.map((student) => {
          return (
            <Styled.StyledMenuItem key={student.id} value={student.id}>
              <Styled.StudentInfoContainer>
                <Styled.StudentName>{student.name}</Styled.StudentName>
                <Styled.StudentRate>
                  {student.hourlyRate && ` ${student.hourlyRate} ₽/занятие`}
                </Styled.StudentRate>
              </Styled.StudentInfoContainer>
            </Styled.StyledMenuItem>
          );
        })}
      </Select>
      {errors.studentId && (
        <Styled.ErrorAlert severity="error">{errors.studentId}</Styled.ErrorAlert>
      )}
    </FormControl>
  );
};
