import React from "react";
import { Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../../../../../shared";
import type { LessonFormData } from "../types";

type SubjectTypeSelectorProps = {
  formData: LessonFormData;
  isLoading: boolean;
  isMobile: boolean;
  onChange: (field: string) => (e: any) => void;
};

export const SubjectTypeSelector: React.FC<SubjectTypeSelectorProps> = ({
  formData,
  isLoading,
  isMobile,
  onChange,
}) => {
  return (
    <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2}>
      <FormControl fullWidth size={isMobile ? "small" : "medium"}>
        <InputLabel>Предмет</InputLabel>
        <Select
          value={formData.subject}
          onChange={onChange("subject")}
          label="Предмет"
          disabled={isLoading}
        >
          {Object.entries(SUBJECT_LABELS).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size={isMobile ? "small" : "medium"}>
        <InputLabel>Тип урока</InputLabel>
        <Select
          value={formData.lessonType}
          onChange={onChange("lessonType")}
          label="Тип урока"
          disabled={isLoading}
        >
          {Object.entries(LESSON_TYPE_LABELS).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
