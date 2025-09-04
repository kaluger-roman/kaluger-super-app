import React from "react";
import { Box } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import type { LessonFormData } from "../types";
import { Alert } from "@mui/material";
import { Lesson } from "../../../../../shared";

type DateTimeSelectorProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onDateChange: (field: "startTime" | "endTime") => (date: Date | null) => void;
  lesson?: Lesson | null;
};

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onDateChange,
  lesson = null,
}) => {
  const isCompleted = !!(lesson && lesson.status === "COMPLETED");

  return (
    <Box display="flex" flexDirection="column" gap={0}>
      <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2}>
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
      </Box>

      {isCompleted && (
        <Box sx={{ width: "100%", mt: 1 }}>
          <Alert severity="info">
            Чтобы изменить время завершённых уроков, используйте функцию
            переноса занятия.
          </Alert>
        </Box>
      )}
    </Box>
  );
};
