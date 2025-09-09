import React, { useRef } from "react";
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
import { useDisableNumberScroll } from "../../../../shared";

export const StudentFormFields: React.FC<StudentFormFieldsProps> = ({
  formData,
  isMobile,
  onChange,
  onGradeChange,
}) => {
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  useDisableNumberScroll(priceInputRef);

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
        label="Телефон"
        value={formData.phone}
        onChange={onChange("phone")}
        fullWidth
        placeholder="+7 (999) 999-99-99"
        size={isMobile ? "small" : "medium"}
      />

      <FormControl fullWidth size={isMobile ? "small" : "medium"}>
        <InputLabel>Способ связи</InputLabel>
        <Select
          value={formData.contactMethod || "WHATSAPP"}
          onChange={(e) =>
            onChange("contactMethod")({
              target: { value: e.target.value },
            } as any)
          }
          label="Способ связи"
        >
          <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
          <MenuItem value="TELEGRAM">Telegram</MenuItem>
        </Select>
      </FormControl>

      {formData.contactMethod === "TELEGRAM" && (
        <TextField
          label="Telegram ник"
          value={(formData as any).telegramNick || ""}
          onChange={onChange("telegramNick")}
          fullWidth
          placeholder="@nickname"
          size={isMobile ? "small" : "medium"}
        />
      )}

      <TextField
        label="Имя родителя"
        value={(formData as any).parentName || ""}
        onChange={onChange("parentName")}
        fullWidth
        placeholder="Имя родителя"
        size={isMobile ? "small" : "medium"}
      />

      <TextField
        label="Телефон родителя"
        value={formData.parentPhone}
        onChange={onChange("parentPhone")}
        fullWidth
        placeholder="+7 (999) 999-99-99"
        size={isMobile ? "small" : "medium"}
      />

      <FormControl fullWidth size={isMobile ? "small" : "medium"}>
        <InputLabel>Способ связи (родители)</InputLabel>
        <Select
          value={formData.parentContactMethod || "WHATSAPP"}
          onChange={(e) =>
            onChange("parentContactMethod")({
              target: { value: e.target.value },
            } as any)
          }
          label="Способ связи (родители)"
        >
          <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
          <MenuItem value="TELEGRAM">Telegram</MenuItem>
        </Select>
      </FormControl>

      {formData.parentContactMethod === "TELEGRAM" && (
        <TextField
          label="Telegram ник (родители)"
          value={(formData as any).parentTelegramNick || ""}
          onChange={onChange("parentTelegramNick")}
          fullWidth
          placeholder="@parent_nick"
          size={isMobile ? "small" : "medium"}
        />
      )}

      {/* main student phone input (already present above) */}

      <TextField
        label="Ставка"
        type="number"
        inputRef={priceInputRef}
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
