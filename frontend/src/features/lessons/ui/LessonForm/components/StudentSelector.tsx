import type { FC } from "react";

import { FormControl, InputLabel, Select, Box } from "@mui/material";
import { useUnit } from "effector-react";

import { studentModel } from "@entities";
import type { Lesson } from "@shared";

import * as Styled from "./StudentSelector.styled";
import type { LessonFormData } from "../types";

type StudentSelectorProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  lesson?: Lesson;
  onChange: (field: string) => (e: { target?: { value: unknown } } | unknown) => void;
};

export const StudentSelector: FC<StudentSelectorProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  lesson,
  onChange,
}) => {
  const activeStudents = useUnit(studentModel.$students);
  const archivedStudents = useUnit(studentModel.$archivedStudents);

  const isCompletedLesson = lesson?.status === "COMPLETED";
  const availableStudents = isCompletedLesson ? archivedStudents : activeStudents;
  const isFieldDisabled = isLoading || isCompletedLesson;

  return (
    <FormControl fullWidth error={!!errors.studentId} size={isMobile ? "small" : "medium"}>
      <InputLabel>Ученик *</InputLabel>
      <Select
        value={formData.studentId}
        onChange={onChange("studentId")}
        label="Ученик *"
        disabled={isFieldDisabled}
      >
        {availableStudents.map((student) => {
          return (
            <Styled.StyledMenuItem key={student.id} value={student.id}>
              <Styled.StudentInfoContainer>
                <Box display="flex" alignItems="center" gap={1}>
                  <Styled.StudentName>{student.name}</Styled.StudentName>
                  {student.archived && <span>📦(Архив)</span>}
                </Box>
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
