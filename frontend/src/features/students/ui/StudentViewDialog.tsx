import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Student } from "../../../shared";
import { StudentDeleteDialog } from "../../../shared/ui";

type StudentViewDialogProps = {
  open: boolean;
  onClose: () => void;
  student?: Student;
  onEdit: () => void;
  onDelete: () => void;
};

export const StudentViewDialog: React.FC<StudentViewDialogProps> = ({
  open,
  onClose,
  student,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!student) return null;

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setDeleteDialogOpen(false);
    // Не закрываем основной диалог здесь - он закроется автоматически при успехе
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
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
        <DialogTitle>
          <Typography variant="h6">Ученик</Typography>
        </DialogTitle>

        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Основная информация */}
            <Box>
              <Typography variant="h6" gutterBottom>
                👤 {student.name}
              </Typography>
              {student.grade && (
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  🎓 {student.grade} класс
                </Typography>
              )}
              {student.hourlyRate && (
                <Typography variant="body1" gutterBottom>
                  💰 {student.hourlyRate} ₽/урок
                </Typography>
              )}
            </Box>

            {(student.contactMethod ||
              student.phone ||
              student.parentPhone) && <Divider />}

            {/* Контактная информация */}
            {(student.contactMethod ||
              student.phone ||
              student.parentPhone) && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  📞 Контакты
                </Typography>
                {student.phone && (
                  <Typography variant="body2" color="text.secondary">
                    Телефон: {student.phone}
                  </Typography>
                )}
                {student.contactMethod && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {student.contactMethod === "WHATSAPP"
                      ? "WhatsApp"
                      : `Telegram (${student.telegramNick})`}
                  </Typography>
                )}

                {student.parentPhone && (
                  <Typography variant="body2" color="text.secondary">
                    Родители:{" "}
                    {student.parentName ? `${student.parentName} — ` : ""}
                    {student.parentPhone} (
                    {student.parentContactMethod === "WHATSAPP"
                      ? "WhatsApp"
                      : "Telegram"}
                    )
                  </Typography>
                )}
                {student.parentContactMethod === "TELEGRAM" &&
                  student.parentTelegramNick && (
                    <Typography variant="body2" color="text.secondary">
                      Telegram (родители): @{student.parentTelegramNick}
                    </Typography>
                  )}
              </Box>
            )}

            {student.notes && <Divider />}

            {/* Заметки */}
            {student.notes && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  🗒️ Заметки
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {student.notes}
                </Typography>
              </Box>
            )}

            <Divider />

            {/* Дополнительная информация */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                ℹ️ Информация
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Добавлен: {formatDate(student.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Обновлен: {formatDate(student.updatedAt)}
              </Typography>
            </Box>
          </Box>
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
              <Button
                onClick={handleDelete}
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                fullWidth={isMobile}
              >
                Удалить
              </Button>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 1,
              }}
            >
              <Button onClick={onClose} variant="outlined" fullWidth={isMobile}>
                Закрыть
              </Button>
              <Button
                onClick={onEdit}
                variant="contained"
                startIcon={<EditIcon />}
                fullWidth={isMobile}
              >
                Редактировать
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      <StudentDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        student={student}
      />
    </>
  );
};
