import React from "react";
import {
  Box,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import type { StudentFormFieldsProps } from "./types";

export const StudentFormFields: React.FC<StudentFormFieldsProps> = ({
  formData,
  isMobile,
  onChange,
  onGradeChange,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={isMobile ? 2 : 3} pt={1}>
      <TextField
        label="Имя студента"
        value={formData.name}
        onChange={onChange("name")}
        fullWidth
        required
        autoFocus
        placeholder="Введите имя студента"
        size={isMobile ? "small" : "medium"}
      />

      <TextField
        label="Email"
        type="email"
        value={formData.email}
        onChange={onChange("email")}
        fullWidth
        placeholder="student@example.com"
        size={isMobile ? "small" : "medium"}
      />

      <TextField
        label="Телефон"
        value={formData.phone}
        onChange={onChange("phone")}
        fullWidth
        placeholder="+7 (999) 999-99-99"
        size={isMobile ? "small" : "medium"}
      />

      <TextField
        label="Почасовая ставка"
        type="number"
        value={formData.hourlyRate}
        onChange={onChange("hourlyRate")}
        fullWidth
        InputProps={{
          startAdornment: <InputAdornment position="start">₽</InputAdornment>,
        }}
        placeholder="1000"
        size={isMobile ? "small" : "medium"}
      />

      <FormControl fullWidth size={isMobile ? "small" : "medium"}>
        <InputLabel>Класс</InputLabel>
        <Select
          value={formData.grade}
          onChange={(e) =>
            onGradeChange(e.target.value === "" ? "" : e.target.value)
          }
          label="Класс"
        >
          <MenuItem value="">Не указан</MenuItem>
          {Array.from({ length: 11 }, (_, i) => i + 1).map((grade) => (
            <MenuItem key={grade} value={grade.toString()}>
              {grade} класс
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Заметки"
        value={formData.notes}
        onChange={onChange("notes")}
        fullWidth
        multiline
        rows={isMobile ? 2 : 3}
        placeholder="Дополнительная информация о студенте"
        size={isMobile ? "small" : "medium"}
      />
    </Box>
  );
};
