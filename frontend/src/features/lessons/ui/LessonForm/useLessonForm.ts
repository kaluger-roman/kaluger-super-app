import { useState, useEffect } from "react";
import type { Lesson } from "../../../../shared";
import type { LessonFormData, ConfirmDialogData } from "./types";
import { updateLesson } from "../../../../entities/lesson";
import type { UpdateLessonDto } from "../../../../shared";

export const useLessonForm = (lesson?: Lesson, open?: boolean) => {
  const [formData, setFormData] = useState<LessonFormData>({
    subject: "PHYSICS",
    lessonType: "EGE",
    description: "",
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000), // +1 hour
    price: "",
    studentId: "",
    homework: "",
    notes: "",
    isRecurring: false,
    isPaid: false,
    isHomeworkSentByTeacher: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogData>({
    open: false,
    title: "",
    message: "",
    action: () => {},
  });

  useEffect(() => {
    if (open) {
      if (lesson) {
        setFormData({
          subject: lesson.subject,
          lessonType: lesson.lessonType,
          description: lesson.description || "",
          startTime: new Date(lesson.startTime),
          endTime: new Date(lesson.endTime),
          price: lesson.price?.toString() || "",
          studentId: lesson.studentId,
          homework: lesson.homework || "",
          notes: lesson.notes || "",
          isRecurring: lesson.isRecurring || false,
          isPaid: lesson.isPaid || false,
          isHomeworkSentByTeacher: lesson.isHomeworkSentByTeacher || false,
        });
      } else {
        const now = new Date();
        const endTime = new Date(now.getTime() + 60 * 60 * 1000);

        setFormData({
          subject: "PHYSICS",
          lessonType: "EGE",
          description: "",
          startTime: now,
          endTime,
          price: "",
          studentId: "",
          homework: "",
          notes: "",
          isRecurring: false,
          isPaid: false,
          isHomeworkSentByTeacher: false,
        });
      }
      setErrors({});
    }
  }, [open, lesson]);

  const handleChange = (field: string) => (e: any) => {
    const value = e.target ? e.target.value : e;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleDateChange =
    (field: "startTime" | "endTime") => (date: Date | null) => {
      if (date) {
        setFormData((prev) => {
          const newData = { ...prev, [field]: date };

          // Автоматически корректируем время окончания при изменении времени начала
          if (field === "startTime") {
            // Сохраняем предыдущую продолжительность, если есть
            let duration = prev.endTime.getTime() - prev.startTime.getTime();

            // Если предыдущая продолжительность некорректна или равна нулю, используем 1 час
            if (!duration || duration <= 0) {
              duration = 60 * 60 * 1000;
            }

            newData.endTime = new Date(date.getTime() + duration);
          }

          return newData;
        });
      }
    };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.studentId) {
      newErrors.studentId = "Выберите ученика";
    }

    if (formData.startTime >= formData.endTime) {
      newErrors.endTime = "Время окончания должно быть позже времени начала";
    }

    if (
      formData.price &&
      (isNaN(Number(formData.price)) || Number(formData.price) < 0)
    ) {
      newErrors.price = "Цена должна быть положительным числом";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancelLesson = () => {
    if (!lesson) return;

    setConfirmDialog({
      open: true,
      title: "Отменить урок",
      message: "Вы уверены, что хотите отменить этот урок?",
      action: async () => {
        try {
          updateLesson({
            id: lesson.id,
            data: { status: "CANCELLED" } as UpdateLessonDto,
          });
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        } catch (error) {
          console.error("Cancel lesson error:", error);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  return {
    formData,
    errors,
    confirmDialog,
    setFormData,
    setConfirmDialog,
    handleChange,
    handleDateChange,
    validateForm,
    handleCancelLesson,
  };
};
