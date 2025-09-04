import React from "react";
import {
  DialogContent,
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { PaymentStatus } from "../../../../../shared/ui";
import {
  StudentSelector,
  SubjectTypeSelector,
  DateTimeSelector,
  PriceInput,
} from "../components";
import { PastDateNotice } from "./PastDateNotice";

type LessonFormContentProps = {
  formData: any;
  errors: any;
  isLoading: boolean;
  isMobile: boolean;
  lesson?: any;
  handleChange: (field: string) => (event: any) => void;
  handleDateChange: any;
  setFormData: any;
};

export const LessonFormContent = ({
  formData,
  errors,
  isLoading,
  isMobile,
  lesson,
  handleChange,
  handleDateChange,
  setFormData,
}: LessonFormContentProps) => {
  return (
    <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Box display="flex" flexDirection="column" gap={isMobile ? 2 : 3}>
          <StudentSelector
            formData={formData}
            errors={errors}
            isLoading={isLoading}
            isMobile={isMobile}
            onChange={handleChange}
          />

          <SubjectTypeSelector
            formData={formData}
            isLoading={isLoading}
            isMobile={isMobile}
            onChange={handleChange}
          />

          <TextField
            label="Описание урока"
            value={formData.description}
            onChange={handleChange("description")}
            error={!!errors.description}
            helperText={errors.description}
            multiline
            rows={isMobile ? 2 : 2}
            fullWidth
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />

          <DateTimeSelector
            formData={formData}
            errors={errors}
            isLoading={isLoading}
            isMobile={isMobile}
            onDateChange={handleDateChange}
          />
          <PastDateNotice
            startTime={formData.startTime}
            endTime={formData.endTime}
            lesson={lesson}
          />

          <PriceInput
            formData={formData}
            errors={errors}
            isLoading={isLoading}
            isMobile={isMobile}
            onChange={handleChange}
          />

          {/* Статус оплаты */}
          {lesson && (
            <PaymentStatus
              lesson={{
                ...lesson,
                isPaid: formData.isPaid,
              }}
              onPaymentChange={(_, isPaid) =>
                setFormData((prev: any) => ({ ...prev, isPaid }))
              }
            />
          )}

          {/* Регулярное занятие */}
          {!lesson && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      isRecurring: e.target.checked,
                    }))
                  }
                  disabled={isLoading}
                />
              }
              label="Регулярное занятие (еженедельно)"
            />
          )}

          <TextField
            label="Домашнее задание"
            value={formData.homework}
            onChange={handleChange("homework")}
            multiline
            rows={2}
            fullWidth
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />

          <TextField
            label="Заметки"
            value={formData.notes}
            onChange={handleChange("notes")}
            multiline
            rows={isMobile ? 2 : 2}
            fullWidth
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />
        </Box>
      </LocalizationProvider>
    </DialogContent>
  );
};
