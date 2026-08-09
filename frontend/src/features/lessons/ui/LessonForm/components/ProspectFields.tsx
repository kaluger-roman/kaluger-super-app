import type { FC } from "react";

import { Box, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";

import { CONTACT_METHOD_LABELS } from "@shared";

import type { LessonFormData } from "../types";

type ProspectFieldsProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  onChange: (field: string) => (e: { target?: { value: unknown } } | unknown) => void;
};

export const ProspectFields: FC<ProspectFieldsProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  onChange,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <TextField
        label="Имя ученика *"
        value={formData.prospectName}
        onChange={onChange("prospectName")}
        error={!!errors.prospectName}
        helperText={errors.prospectName}
        fullWidth
        disabled={isLoading}
        size={isMobile ? "small" : "medium"}
      />

      <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2}>
        <TextField
          label="Телефон"
          value={formData.prospectPhone}
          onChange={onChange("prospectPhone")}
          fullWidth
          disabled={isLoading}
          size={isMobile ? "small" : "medium"}
        />

        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
          <InputLabel id="prospect-contact-method-label">Мессенджер</InputLabel>
          <Select
            labelId="prospect-contact-method-label"
            value={formData.prospectContactMethod}
            onChange={onChange("prospectContactMethod")}
            label="Мессенджер"
            disabled={isLoading}
          >
            <MenuItem value="">Не указан</MenuItem>
            {Object.entries(CONTACT_METHOD_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
