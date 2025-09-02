import React from "react";
import { DialogActions, Box, Button } from "@mui/material";

type LessonFormActionsProps = {
  lesson?: any;
  isLoading: boolean;
  isMobile: boolean;
  formData: any;
  onClose: () => void;
  onCancelLesson: () => void;
};

export const LessonFormActions = ({
  lesson,
  isLoading,
  isMobile,
  formData,
  onClose,
  onCancelLesson,
}: LessonFormActionsProps) => {
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <DialogActions sx={{ p: 3, pt: 1 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          width: "100%",
          gap: isMobile ? 2 : 0,
        }}
      >
        <Box>
          {lesson && lesson.status !== "CANCELLED" && (
            <Button
              onClick={onCancelLesson}
              variant="outlined"
              color="error"
              disabled={isLoading}
              fullWidth={isMobile}
              sx={{ mr: isMobile ? 0 : 1 }}
            >
              Отменить урок
            </Button>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 1,
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={isLoading}
            fullWidth={isMobile}
          >
            Отмена
          </Button>
          <Button
            type="submit"
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
        </Box>
      </Box>
    </DialogActions>
  );
};
