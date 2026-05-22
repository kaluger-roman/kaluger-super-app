import { Button } from "@mui/material";

import type { Lesson } from "@shared";

import * as Styled from "./LessonFormActions.styled";
import type { LessonFormData } from "../types";

type LessonFormActionsProps = {
  lesson?: Lesson;
  isLoading: boolean;
  isMobile: boolean;
  formData: LessonFormData;
  onClose: () => void;
  onCancelLesson: () => void;
  onSubmit: () => void;
};

export const LessonFormActions = ({
  lesson,
  isLoading,
  isMobile,
  formData,
  onClose,
  onCancelLesson,
  onSubmit,
}: LessonFormActionsProps) => {
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Styled.StyledDialogActions>
      <Styled.Container $isMobile={isMobile}>
        <Styled.LeftColumn>
          {lesson && lesson.status !== "CANCELLED" && (
            <Styled.CancelButton
              onClick={onCancelLesson}
              variant="outlined"
              color="error"
              disabled={isLoading}
              fullWidth={isMobile}
              $isMobile={isMobile}
            >
              Отменить урок
            </Styled.CancelButton>
          )}
        </Styled.LeftColumn>
        <Styled.RightColumn $isMobile={isMobile}>
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={isLoading}
            fullWidth={isMobile}
          >
            Отмена
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            disabled={isLoading || !formData.studentId}
            fullWidth={isMobile}
          >
            {isLoading
              ? lesson
                ? "Обновление..."
                : "Создание..."
              : lesson
              ? "Обновить урок"
              : "Создать урок"}
          </Button>
        </Styled.RightColumn>
      </Styled.Container>
    </Styled.StyledDialogActions>
  );
};
