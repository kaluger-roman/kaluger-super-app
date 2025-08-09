import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { useStore } from "effector-react";
import {
  CreateLessonDto,
  UpdateLessonDto,
  Subject,
  LessonType,
  SUBJECT_LABELS,
  LESSON_TYPE_LABELS,
  Lesson,
} from "../../../shared";
import { ConfirmDialog, PaymentStatus } from "../../../shared/ui";
import { $students } from "../../../entities/student";
import {
  addLesson,
  updateLesson,
  $lessonsIsLoading,
} from "../../../entities/lesson";

type LessonFormProps = {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
};

export const LessonForm: React.FC<LessonFormProps> = ({
  open,
  onClose,
  lesson,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const students = useStore($students);
  const isLoading = useStore($lessonsIsLoading);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    action: () => {},
  });

  const [formData, setFormData] = useState({
    subject: "MATHEMATICS" as Subject,
    lessonType: "SCHOOL" as LessonType,
    description: "",
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000), // +1 hour
    price: "",
    studentId: "",
    homework: "",
    notes: "",
    isRecurring: false,
    isPaid: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Заполняем форму данными урока при редактировании
  useEffect(() => {
    if (lesson) {
      setFormData({
        subject: lesson.subject as Subject,
        lessonType: lesson.lessonType as LessonType,
        description: lesson.description || "",
        startTime: new Date(lesson.startTime),
        endTime: new Date(lesson.endTime),
        price: lesson.price?.toString() || "",
        studentId: lesson.studentId,
        homework: lesson.homework || "",
        notes: lesson.notes || "",
        isRecurring: lesson.isRecurring || false,
        isPaid: lesson.isPaid || false,
      });
    } else {
      const now = new Date();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000);

      setFormData({
        subject: "MATHEMATICS" as Subject,
        lessonType: "SCHOOL" as LessonType,
        description: "",
        startTime: now,
        endTime,
        price: "",
        studentId: "",
        homework: "",
        notes: "",
        isRecurring: false,
        isPaid: false,
      });
    }
    setErrors({});
  }, [lesson, open]);

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
            newData.endTime = new Date(date.getTime() + 60 * 60 * 1000);
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

    if (formData.startTime < new Date() && !lesson) {
      newErrors.startTime = "Время начала не может быть в прошлом";
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

      if (lesson) {
        // Редактирование существующего урока
        updateLesson({ id: lesson.id, data: lessonData as UpdateLessonDto });
      } else {
        // Создание нового урока
        addLesson(lessonData as CreateLessonDto);
      }

      // Закрываем форму при успешном сохранении
      onClose();
    } catch (error) {
      console.error("Lesson form error:", error);
    }
  };

  const handleCancelLesson = async () => {
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
          onClose();
        } catch (error) {
          console.error("Cancel lesson error:", error);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const selectedStudent = students.find((s) => s.id === formData.studentId);

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
        <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Box display="flex" flexDirection="column" gap={isMobile ? 2 : 3}>
              {/* Выбор ученика */}
              <FormControl
                fullWidth
                error={!!errors.studentId}
                size={isMobile ? "small" : "medium"}
              >
                <InputLabel>Ученик *</InputLabel>
                <Select
                  value={formData.studentId}
                  onChange={handleChange("studentId")}
                  label="Ученик *"
                  disabled={isLoading}
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.name}
                      {student.hourlyRate && ` (${student.hourlyRate} ₽/час)`}
                    </MenuItem>
                  ))}
                </Select>
                {errors.studentId && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {errors.studentId}
                  </Alert>
                )}
              </FormControl>

              {/* Предмет и тип урока */}
              <Box
                display="flex"
                flexDirection={isMobile ? "column" : "row"}
                gap={2}
              >
                <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                  <InputLabel>Предмет</InputLabel>
                  <Select
                    value={formData.subject}
                    onChange={handleChange("subject")}
                    label="Предмет"
                    disabled={isLoading}
                  >
                    {Object.entries(SUBJECT_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                  <InputLabel>Тип урока</InputLabel>
                  <Select
                    value={formData.lessonType}
                    onChange={handleChange("lessonType")}
                    label="Тип урока"
                    disabled={isLoading}
                  >
                    {Object.entries(LESSON_TYPE_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Описание */}
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

              {/* Время */}
              <Box
                display="flex"
                flexDirection={isMobile ? "column" : "row"}
                gap={2}
              >
                <DateTimePicker
                  label="Время начала"
                  value={formData.startTime}
                  onChange={handleDateChange("startTime")}
                  disabled={isLoading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.startTime,
                      helperText: errors.startTime,
                      size: isMobile ? "small" : "medium",
                    },
                  }}
                />

                <DateTimePicker
                  label="Время окончания"
                  value={formData.endTime}
                  onChange={handleDateChange("endTime")}
                  disabled={isLoading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.endTime,
                      helperText: errors.endTime,
                      size: isMobile ? "small" : "medium",
                    },
                  }}
                />
              </Box>

              {/* Цена */}
              <TextField
                label="Стоимость урока (₽)"
                type="number"
                value={formData.price}
                onChange={handleChange("price")}
                error={!!errors.price}
                helperText={
                  errors.price ||
                  (selectedStudent?.hourlyRate
                    ? `Рекомендуемая: ${selectedStudent.hourlyRate} ₽`
                    : "")
                }
                placeholder={selectedStudent?.hourlyRate?.toString()}
                fullWidth
                disabled={isLoading}
                size={isMobile ? "small" : "medium"}
              />

              {/* Статус оплаты */}
              {lesson && (
                <PaymentStatus
                  lesson={{
                    ...lesson,
                    isPaid: formData.isPaid,
                  }}
                  onPaymentChange={(_, isPaid) =>
                    setFormData((prev) => ({ ...prev, isPaid }))
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

              {/* Домашнее задание и заметки */}
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
                  onClick={handleCancelLesson}
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
