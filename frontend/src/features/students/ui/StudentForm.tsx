import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  InputAdornment,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useStore } from "effector-react";
import {
  addStudent,
  updateStudent,
  removeStudent,
  $studentsIsLoading,
} from "../../../entities";
import { showNotification } from "../../../shared";
import { StudentDeleteDialog } from "../../../shared/ui";
import type { Student } from "../../../shared";

type StudentFormProps = {
  open: boolean;
  onClose: () => void;
  student?: Student;
};

export const StudentForm: React.FC<StudentFormProps> = ({
  open,
  onClose,
  student,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isLoading = useStore($studentsIsLoading);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    hourlyRate: "",
    grade: "",
    notes: "",
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || "",
        email: student.email || "",
        phone: student.phone || "",
        hourlyRate: student.hourlyRate?.toString() || "",
        grade: student.grade?.toString() || "",
        notes: student.notes || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        hourlyRate: "",
        grade: "",
        notes: "",
      });
    }
  }, [student, open]);

  const handleChange =
    (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      showNotification({
        type: "error",
        message: "Имя студента обязательно для заполнения",
      });
      return;
    }

    try {
      const studentData = {
        name: formData.name.trim(),
        email: formData.email.trim() || "",
        phone: formData.phone.trim() || "",
        hourlyRate: formData.hourlyRate
          ? parseFloat(formData.hourlyRate)
          : null,
        grade:
          formData.grade && formData.grade !== ""
            ? parseInt(formData.grade, 10)
            : null,
        notes: formData.notes.trim() || "",
      };

      if (student) {
        await updateStudent({ id: student.id, data: studentData });
        showNotification({
          type: "success",
          message: "Ученик успешно обновлен",
        });
      } else {
        // For creation, don't send empty strings - use undefined
        const createData = {
          name: studentData.name,
          email: studentData.email || undefined,
          phone: studentData.phone || undefined,
          hourlyRate: studentData.hourlyRate || undefined,
          grade: studentData.grade || undefined,
          notes: studentData.notes || undefined,
        };
        await addStudent(createData);
        showNotification({
          type: "success",
          message: "Ученик успешно добавлен",
        });
      }

      onClose();
    } catch (error) {
      showNotification({
        type: "error",
        message: student
          ? "Ошибка при обновлении студента"
          : "Ошибка при добавлении студента",
      });
    }
  };

  const handleDeleteStudent = () => {
    if (!student) return;
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!student) return;

    try {
      await removeStudent(student.id);
      showNotification({
        type: "success",
        message: "Ученик успешно удален",
      });
      setDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      showNotification({
        type: "error",
        message: "Ошибка при удалении студента",
      });
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? "100vh" : "90vh",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 2 }}>
          {student ? "Редактировать студента" : "Добавить студента"}
        </DialogTitle>

        <DialogContent>
          <Box
            display="flex"
            flexDirection="column"
            gap={isMobile ? 2 : 3}
            pt={1}
          >
            <TextField
              label="Имя студента"
              value={formData.name}
              onChange={handleChange("name")}
              fullWidth
              required
              autoFocus
              placeholder="Введите имя студента"
              size={isMobile ? "small" : "medium"}
            />

            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              fullWidth
              placeholder="student@example.com"
              size={isMobile ? "small" : "medium"}
            />

            <TextField
              label="Телефон"
              value={formData.phone}
              onChange={handleChange("phone")}
              fullWidth
              placeholder="+7 (999) 999-99-99"
              size={isMobile ? "small" : "medium"}
            />

            <TextField
              label="Почасовая ставка"
              type="number"
              value={formData.hourlyRate}
              onChange={handleChange("hourlyRate")}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">₽</InputAdornment>
                ),
              }}
              placeholder="1000"
              size={isMobile ? "small" : "medium"}
            />

            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Класс</InputLabel>
              <Select
                value={formData.grade}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    grade: e.target.value === "" ? "" : e.target.value,
                  }))
                }
                label="Класс"
              >
                <MenuItem value="">Не указан</MenuItem>
                {Array.from({ length: 11 }, (_, i) => i + 1).map((grade) => (
                  <MenuItem key={grade} value={grade.toString()}>
                    {grade} класс
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Заметки"
              value={formData.notes}
              onChange={handleChange("notes")}
              fullWidth
              multiline
              rows={isMobile ? 2 : 3}
              placeholder="Дополнительная информация о студенте"
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
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
              {student && (
                <Button
                  onClick={handleDeleteStudent}
                  startIcon={<DeleteIcon />}
                  color="error"
                  variant="outlined"
                  disabled={isLoading}
                  fullWidth={isMobile}
                >
                  Удалить
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
                onClick={onClose}
                startIcon={<CloseIcon />}
                disabled={isLoading}
                fullWidth={isMobile}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={
                  isLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                disabled={isLoading}
                fullWidth={isMobile}
              >
                {student ? "Сохранить" : "Добавить"}
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </form>

      <StudentDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        student={student}
      />
    </Dialog>
  );
};
