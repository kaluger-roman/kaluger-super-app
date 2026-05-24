import type { FC } from "react";

import { Autocomplete, Box, TextField } from "@mui/material";
import { useUnit } from "effector-react";

import { studentModel } from "@entities";
import type { Lesson, Student } from "@shared";

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

const filterStudents = (options: Student[], inputValue: string): Student[] => {
  const query = inputValue.trim().toLowerCase();
  if (!query) return options;
  return options.filter((student) => student.name.toLowerCase().includes(query));
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

  const selectedStudent =
    availableStudents.find((student) => student.id === formData.studentId) ?? null;

  return (
    <Autocomplete<Student, false, false, false>
      options={availableStudents}
      value={selectedStudent}
      getOptionLabel={(student) => student.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
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
      renderOption={(props, student) => (
        <li {...props} key={student.id}>
          <Styled.StudentInfoContainer>
            <Box display="flex" alignItems="center" gap={1}>
              <Styled.StudentName>{student.name}</Styled.StudentName>
              {student.archived && <span>📦(Архив)</span>}
            </Box>
            <Styled.StudentRate>
              {student.hourlyRate != null && student.hourlyRate > 0
                ? ` ${student.hourlyRate} ₽/занятие`
                : ""}
            </Styled.StudentRate>
          </Styled.StudentInfoContainer>
        </li>
      )}
      slotProps={{
        popper: { style: { zIndex: 1500 } },
      }}
    />
  );
};
