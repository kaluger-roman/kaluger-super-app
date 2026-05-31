import type { FC } from "react";

import { Autocomplete, Box, TextField, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { studentModel } from "@entities";
import type { Lesson, Student } from "@shared";

import {
  filterStudents,
  getStudentLabel,
  isSameStudent,
} from "./StudentSelector.helpers";
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
  const theme = useTheme();
  const activeStudents = useUnit(studentModel.$students);
  const archivedStudents = useUnit(studentModel.$archivedStudents);

  const isCompletedLesson = lesson?.status === "COMPLETED";
  const availableStudents = isCompletedLesson ? archivedStudents : activeStudents;
  const isFieldDisabled = isLoading || isCompletedLesson;

  const selectedStudent =
    availableStudents.find((student) => student.id === formData.studentId) ?? null;

  return (
    <Autocomplete<Student, false, false, false>
      options={availableStudents}
      value={selectedStudent}
      getOptionLabel={getStudentLabel}
      isOptionEqualToValue={isSameStudent}
      filterOptions={(options, { inputValue }) => filterStudents(options, inputValue)}
      onChange={(_, newValue) => {
        onChange("studentId")({ target: { value: newValue?.id ?? "" } });
      }}
      disabled={isFieldDisabled}
      size={isMobile ? "small" : "medium"}
      noOptionsText="Учеников не найдено"
      openText="Открыть"
      closeText="Закрыть"
      clearText="Очистить"
      renderInput={(params) => (
        <TextField
          {...params}
          label="Ученик *"
          error={!!errors.studentId}
          helperText={errors.studentId}
          placeholder="Начните вводить имя"
        />
      )}
      renderOption={(props, student) => {
        const { key: _muiKey, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & {
          key?: string;
        };
        return (
          <Styled.OptionItem key={student.id} {...optionProps}>
            <Styled.StudentInfoContainer>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Styled.StudentName>{student.name}</Styled.StudentName>
                {student.grade != null && (
                  <Styled.GradeBadge>{student.grade} класс</Styled.GradeBadge>
                )}
                {student.archived && <Styled.ArchivedBadge>📦 Архив</Styled.ArchivedBadge>}
              </Box>
              {student.hourlyRate != null && student.hourlyRate > 0 && (
                <Styled.StudentRate>{student.hourlyRate} ₽/занятие</Styled.StudentRate>
              )}
            </Styled.StudentInfoContainer>
          </Styled.OptionItem>
        );
      }}
      slotProps={{
        popper: { style: { zIndex: theme.zIndex.modal + 1 } },
      }}
    />
  );
};
