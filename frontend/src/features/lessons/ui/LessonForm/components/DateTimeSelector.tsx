import React from "react";
import { Box } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import type { LessonFormData } from "../types";

type DateTimeSelectorProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onDateChange: (field: "startTime" | "endTime") => (date: Date | null) => void;
};

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onDateChange,
}) => {
  return (
    <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2}>
      <DateTimePicker
        label="Время начала"
        value={formData.startTime}
        onChange={onDateChange("startTime")}
        disabled={isLoading}
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
        disabled={isLoading}
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
  );
};
