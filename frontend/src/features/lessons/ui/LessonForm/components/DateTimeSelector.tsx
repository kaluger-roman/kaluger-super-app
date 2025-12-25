import type { FC } from "react";

import { Alert } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

import type { Lesson } from "@shared";

import * as Styled from "./DateTimeSelector.styled";
import type { LessonFormData } from "../types";

type DateTimeSelectorProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onDateChange: (field: "startTime" | "endTime") => (date: Date | null) => void;
  lesson?: Lesson | null;
};

export const DateTimeSelector: FC<DateTimeSelectorProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onDateChange,
  lesson = null,
}) => {
  const isCompleted = !!(lesson && lesson.status === "COMPLETED");

  return (
    <Styled.FieldsColumn>
      <Styled.DateTimeRow $isMobile={isMobile}>
        <DateTimePicker
          label="Время начала"
          value={formData.startTime}
          onChange={onDateChange("startTime")}
          disabled={isLoading || isCompleted}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!errors.startTime,
              helperText: errors.startTime,
              size: isMobile ? "small" : "medium",
            },
          }}
        />

        <DateTimePicker
          label="Время окончания"
          value={formData.endTime}
          onChange={onDateChange("endTime")}
          disabled={isLoading || isCompleted}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!errors.endTime,
              helperText: errors.endTime,
              size: isMobile ? "small" : "medium",
            },
          }}
        />
      </Styled.DateTimeRow>

      {isCompleted && (
        <Styled.AlertContainer>
          <Alert severity="info">
            Чтобы изменить время завершённых уроков, используйте функцию переноса занятия.
          </Alert>
        </Styled.AlertContainer>
      )}
    </Styled.FieldsColumn>
  );
};
