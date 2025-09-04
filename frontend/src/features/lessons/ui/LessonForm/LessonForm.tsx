import React, { useEffect } from "react";
import { Dialog, DialogTitle, useMediaQuery, useTheme } from "@mui/material";
import { useStore } from "effector-react";
import { CreateLessonDto, UpdateLessonDto } from "../../../../shared";
import { ConfirmDialog } from "../../../../shared/ui";
import {
  addLesson,
  updateLesson,
  $lessonsIsLoading,
  closeLessonDialog,
} from "../../../../entities/lesson";
import { useLessonForm } from "./useLessonForm";
import { LessonFormContent, LessonFormActions } from "./components";
import type { LessonFormProps } from "./types";

export const LessonForm: React.FC<LessonFormProps> = ({
  open,
  onClose,
  lesson,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isLoading = useStore($lessonsIsLoading);

  const {
    formData,
    errors,
    confirmDialog,
    setFormData,
    setConfirmDialog,
    handleChange,
    handleDateChange,
    validateForm,
    handleCancelLesson,
  } = useLessonForm(lesson, onClose, open);

  // Подписываемся на событие закрытия диалога
  useEffect(() => {
    const unsubscribe = closeLessonDialog.watch(() => {
      onClose();
    });
    return unsubscribe;
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const lessonData = {
        subject: formData.subject,
        lessonType: formData.lessonType,
        description: formData.description || null,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        price: formData.price ? Number(formData.price) : null,
        studentId: formData.studentId,
        homework: formData.homework || null,
        notes: formData.notes || null,
        isRecurring: formData.isRecurring,
        isPaid: formData.isPaid,
      };

      const performUpdate = () => {
        if (lesson) {
          updateLesson({ id: lesson.id, data: lessonData as UpdateLessonDto });
        } else {
          addLesson(lessonData as CreateLessonDto);
        }
      };

      // If editing an existing recurring lesson and time changed, show confirmation
      if (lesson && lesson.isRecurring && lesson.status === "SCHEDULED") {
        const oldStart = new Date(lesson.startTime).toISOString();
        const oldEnd = new Date(lesson.endTime).toISOString();
        if (
          oldStart !== lessonData.startTime ||
          oldEnd !== lessonData.endTime
        ) {
          setConfirmDialog({
            open: true,
            title: "Изменение времени регулярного урока",
            message:
              "Вы уверены? Время будет изменено у всех ещё несостоявшихся запланированных и не перенесённых регулярных уроков в этой серии.",
            action: async () => {
              performUpdate();
              setConfirmDialog((prev) => ({ ...prev, open: false }));
            },
          });
          return;
        }
      }

      performUpdate();
    } catch (error) {
      console.error("Lesson form error:", error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? "100vh" : "90vh",
        },
      }}
    >
      <DialogTitle sx={{ pb: isMobile ? 1 : 2 }}>
        {lesson ? "Редактировать урок" : "Создать новый урок"}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <LessonFormContent
          formData={formData}
          errors={errors}
          isLoading={isLoading}
          isMobile={isMobile}
          lesson={lesson}
          handleChange={handleChange}
          handleDateChange={handleDateChange}
          setFormData={setFormData}
        />

        <LessonFormActions
          lesson={lesson}
          isLoading={isLoading}
          isMobile={isMobile}
          formData={formData}
          onClose={handleClose}
          onCancelLesson={handleCancelLesson}
        />
      </form>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity="warning"
      />
    </Dialog>
  );
};
