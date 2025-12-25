import { TextField, FormControlLabel, Checkbox } from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ru } from "date-fns/locale";

import type { Lesson } from "@shared";
import { PaymentStatus, HomeworkSentStatus } from "@shared/ui";

import * as Styled from "./LessonFormContent.styled";
import { PastDateNotice } from "./PastDateNotice";
import type { LessonFormData } from "../types";
import { DateTimeSelector } from "./DateTimeSelector";
import { PriceInput } from "./PriceInput";
import { StudentSelector } from "./StudentSelector";
import { SubjectTypeSelector } from "./SubjectTypeSelector";

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

          <Styled.CheckboxContainer>
            {lesson && (
              <PaymentStatus
                lesson={{
                  ...lesson,
                  isPaid: formData.isPaid,
                }}
                onPaymentChange={(_, isPaid) => setFormData((prev) => ({ ...prev, isPaid }))}
              />
            )}
            {lesson && (
              <HomeworkSentStatus
                lesson={{
                  ...lesson,
                  isHomeworkSentByTeacher: formData.isHomeworkSentByTeacher,
                }}
                onHomeworkSentChange={(_, isSent) =>
                  setFormData((prev) => ({
                    ...prev,
                    isHomeworkSentByTeacher: isSent,
                  }))
                }
              />
            )}
          </Styled.CheckboxContainer>
          {/* Регулярное занятие */}
          {!lesson && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData((prev) => ({
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
        </Styled.FormContainer>
      </LocalizationProvider>
    </Styled.StyledDialogContent>
  );
};
