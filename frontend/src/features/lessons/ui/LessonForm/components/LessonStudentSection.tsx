import type { FC } from "react";

import { Box, Checkbox, FormControlLabel } from "@mui/material";

import { InfoTooltip } from "@shared";
import type { Lesson } from "@shared";

import { TRIAL_LESSON_HINT } from "./LessonStudentSection.constants";
import { ProspectFields } from "./ProspectFields";
import { StudentSelector } from "./StudentSelector";
import type { LessonFormData } from "../types";

type LessonStudentSectionProps = {
  formData: LessonFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  isMobile: boolean;
  lesson?: Lesson;
  onChange: (field: string) => (e: { target?: { value: unknown } } | unknown) => void;
};

export const LessonStudentSection: FC<LessonStudentSectionProps> = ({
  formData,
  errors,
  isLoading,
  isMobile,
  lesson,
  onChange,
}) => {
  const canToggleWithoutStudent = !lesson || !lesson.studentId;

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      {canToggleWithoutStudent && (
        <Box display="flex" alignItems="center" gap={0.5}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.withoutStudent}
                onChange={(e) => onChange("withoutStudent")(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="Пробный урок"
          />
          <InfoTooltip title={TRIAL_LESSON_HINT} ariaLabel="Что такое пробный урок" />
        </Box>
      )}

      {formData.withoutStudent ? (
        <ProspectFields
          formData={formData}
          errors={errors}
          isLoading={isLoading}
          isMobile={isMobile}
          onChange={onChange}
        />
      ) : (
        <StudentSelector
          formData={formData}
          errors={errors}
          isLoading={isLoading}
          isMobile={isMobile}
          lesson={lesson}
          onChange={onChange}
        />
      )}
    </Box>
  );
};
