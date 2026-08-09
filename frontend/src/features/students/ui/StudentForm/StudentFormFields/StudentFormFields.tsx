import type { FC } from "react";
import { useRef } from "react";

import {
  Box,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

import { CONTACT_METHOD_LABELS, useDisableNumberScroll } from "@shared";

import type { StudentFormFieldsProps } from "../types";

export const StudentFormFields: FC<StudentFormFieldsProps> = ({
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
        label="Имя ученика"
        value={formData.name}
        onChange={onChange("name")}
        fullWidth
        required
        autoFocus
        placeholder="Введите имя ученика"
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
        <InputLabel id="student-contact-method-label">Способ связи</InputLabel>
        <Select
          labelId="student-contact-method-label"
          value={formData.contactMethod || "WHATSAPP"}
          onChange={(e: SelectChangeEvent<string>) =>
            onChange("contactMethod")({ target: { value: e.target.value } })
          }
          label="Способ связи"
        >
          <MenuItem value="WHATSAPP">{CONTACT_METHOD_LABELS.WHATSAPP}</MenuItem>
          <MenuItem value="TELEGRAM">{CONTACT_METHOD_LABELS.TELEGRAM}</MenuItem>
          <MenuItem value="MAX">{CONTACT_METHOD_LABELS.MAX}</MenuItem>
        </Select>
      </FormControl>

      {formData.contactMethod === "TELEGRAM" && (
        <TextField
          label="Telegram ник"
          value={formData.telegramNick || ""}
          onChange={onChange("telegramNick")}
          fullWidth
          placeholder="@nickname"
          size={isMobile ? "small" : "medium"}
        />
      )}

      <TextField
        label="Имя родителя"
        value={formData.parentName || ""}
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
        <InputLabel id="parent-contact-method-label">
          Способ связи (родители)
        </InputLabel>
        <Select
          labelId="parent-contact-method-label"
          value={formData.parentContactMethod || "WHATSAPP"}
          onChange={(e: SelectChangeEvent<string>) =>
            onChange("parentContactMethod")({ target: { value: e.target.value } })
          }
          label="Способ связи (родители)"
        >
          <MenuItem value="WHATSAPP">{CONTACT_METHOD_LABELS.WHATSAPP}</MenuItem>
          <MenuItem value="TELEGRAM">{CONTACT_METHOD_LABELS.TELEGRAM}</MenuItem>
          <MenuItem value="MAX">{CONTACT_METHOD_LABELS.MAX}</MenuItem>
        </Select>
      </FormControl>

      {formData.parentContactMethod === "TELEGRAM" && (
        <TextField
          label="Telegram ник (родители)"
          value={formData.parentTelegramNick || ""}
          onChange={onChange("parentTelegramNick")}
          fullWidth
          placeholder="@parent_nick"
          size={isMobile ? "small" : "medium"}
        />
      )}

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
          onChange={(e) => onGradeChange(e.target.value === "" ? "" : e.target.value)}
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
        placeholder="Дополнительная информация об ученике"
        size={isMobile ? "small" : "medium"}
      />
    </Box>
  );
};
