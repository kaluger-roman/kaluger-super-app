import { TextField } from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ru } from "date-fns/locale";

import type { Lesson } from "@shared";

import { DateTimeSelector } from "./DateTimeSelector";
import * as Styled from "./LessonFormContent.styled";
import { LessonStatusSection } from "./LessonStatusSection";
import { LessonStudentSection } from "./LessonStudentSection";
import { PastDateNotice } from "./PastDateNotice";
import { PriceInput } from "./PriceInput";
import { RecurringCheckbox } from "./RecurringCheckbox";
import { SubjectTypeSelector } from "./SubjectTypeSelector";
import type { LessonFormData } from "../LessonForm.types";

type LessonFormContentProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  lesson?: Lesson;
  handleChange: (field: string) => (event: { target?: { value: unknown } } | unknown) => void;
  handleDateChange: (field: "startTime" | "endTime") => (date: Date | null) => void;
  setFormData: (updater: (prev: LessonFormData) => LessonFormData) => void;
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
    <Styled.StyledDialogContent $isMobile={isMobile}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Styled.FormContainer $isMobile={isMobile}>
          <LessonStudentSection
            formData={formData}
            errors={errors}
            isLoading={isLoading}
            isMobile={isMobile}
            lesson={lesson}
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
            lesson={lesson}
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

          {formData.isPaid && (
            <Styled.DateFieldWrapper>
              <TextField
                label="Дата оплаты"
                type="date"
                fullWidth
                value={formData.paymentDate || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
                disabled={isLoading}
                size={isMobile ? "small" : "medium"}
                InputLabelProps={{ shrink: true }}
              />
            </Styled.DateFieldWrapper>
          )}

          <LessonStatusSection lesson={lesson} formData={formData} setFormData={setFormData} />
          {!lesson && !formData.withoutStudent && (
            <RecurringCheckbox
              checked={formData.isRecurring}
              disabled={isLoading}
              onChange={(isRecurring) => setFormData((prev) => ({ ...prev, isRecurring }))}
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
        </Styled.FormContainer>
      </LocalizationProvider>
    </Styled.StyledDialogContent>
  );
};
