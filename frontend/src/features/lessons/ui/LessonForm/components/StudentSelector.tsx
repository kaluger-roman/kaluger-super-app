import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import { useStore } from "effector-react";
import { $students } from "../../../../../entities/student";
import type { LessonFormData } from "../types";

type StudentSelectorProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onChange: (field: string) => (e: any) => void;
};

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onChange,
}) => {
  const students = useStore($students);

  return (
    <FormControl
      fullWidth
      error={!!errors.studentId}
      size={isMobile ? "small" : "medium"}
    >
      <InputLabel>Ученик *</InputLabel>
      <Select
        value={formData.studentId}
        onChange={onChange("studentId")}
        label="Ученик *"
        disabled={isLoading}
      >
        {students.map((student) => {
          const contact = student.phone || student.telegramNick || null;
          const contactLabel = `${contact};` || "Нет контакта;";

          return (
            <MenuItem
              key={student.id}
              value={student.id}
              sx={{ alignItems: "flex-start" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                }}
              >
                <span style={{ fontWeight: 700 }}>{student.name}</span>
                <span
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: "rgba(0,0,0,0.6)",
                  }}
                >
                  {contactLabel}
                  {student.hourlyRate && ` ${student.hourlyRate} ₽/занятие`}
                </span>
              </div>
            </MenuItem>
          );
        })}
      </Select>
      {errors.studentId && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {errors.studentId}
        </Alert>
      )}
    </FormControl>
  );
};
