import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Fab,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  IconButton,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Add as AddIcon } from "@mui/icons-material";
import { useUnit } from "effector-react";
import {
  $students,
  $studentsIsLoading,
  removeStudent,
  closeStudentDialog,
} from "../../entities";
import { Loading } from "../../shared";
import { StudentDeleteDialog } from "../../shared/ui";
import { StudentForm, StudentViewDialog } from "../../features/students";
import type { Student } from "../../shared";

export const StudentsPage: React.FC = () => {
  const students = useUnit($students);
  const isLoading = useUnit($studentsIsLoading);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [viewingStudent, setViewingStudent] = useState<Student | undefined>();

  // Context menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<Student | null>(
    null
  );

  // Подписываемся на событие закрытия диалога
  useEffect(() => {
    const unsubscribe = closeStudentDialog.watch(() => {
      setIsDialogOpen(false);
      setIsViewDialogOpen(false);
      setEditingStudent(undefined);
      setViewingStudent(undefined);
      setDeleteDialogOpen(null);
    });
    return unsubscribe;
  }, []);

  // Context menu handlers
  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    student: Student
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleEditFromMenu = () => {
    if (selectedStudent) {
      setEditingStudent(selectedStudent);
      setIsDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteFromMenu = () => {
    if (selectedStudent) {
      setDeleteDialogOpen(selectedStudent);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (selectedStudent) {
      removeStudent(selectedStudent.id);
      // Диалоги закроются автоматически при успешном удалении
    }
  };

  const handleStudentClick = (student: Student) => {
    setViewingStudent(student);
    setIsViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setViewingStudent(undefined);
  };

  const handleEditFromView = () => {
    if (viewingStudent) {
      setEditingStudent(viewingStudent);
      setIsDialogOpen(true);
      setIsViewDialogOpen(false);
      setViewingStudent(undefined);
    }
  };

  const handleDeleteFromView = () => {
    if (viewingStudent) {
      removeStudent(viewingStudent.id);
      // Диалог закроется автоматически при успешном удалении
    }
  };

  const handleCloseEditDialog = () => {
    setIsDialogOpen(false);
    setEditingStudent(undefined);
  };

  if (isLoading && students.length === 0) {
    return <Loading message="Загрузка студентов..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          👥 Ученики
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Управление вашими учениками
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        {students.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="h5" color="text.secondary" gutterBottom>
              📚 У вас пока нет учеников
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Добавьте первого ученика, нажав на кнопку "+"
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {Object.entries(
              students.reduce<Record<string, Student[]>>((acc, student) => {
                const grade = student.grade
                  ? `${student.grade} класс`
                  : "Без класса";
                if (!acc[grade]) acc[grade] = [];
                acc[grade].push(student);
                return acc;
              }, {})
            )
              .sort((a, b) => {
                // Сортировка по номеру класса, "Без класса" в конце
                if (a[0] === "Без класса") return 1;
                if (b[0] === "Без класса") return -1;
                return parseInt(a[0]) - parseInt(b[0]);
              })
              .map(([grade, studentsInGrade]) => (
                <Accordion key={grade} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {grade} ({studentsInGrade.length}{" "}
                      {studentsInGrade.length === 1 ? "ученик" : "учеников"})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexDirection="column" gap={2}>
                      {studentsInGrade.map((student) => (
                        <Card
                          key={student.id}
                          variant="outlined"
                          sx={{ cursor: "pointer" }}
                          onClick={() => handleStudentClick(student)}
                        >
                          <CardContent sx={{ py: 2 }}>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="flex-start"
                            >
                              <Box flex={1}>
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {student.name}
                                </Typography>
                                {student.email && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {student.email}
                                  </Typography>
                                )}
                                {student.phone && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {student.phone}
                                  </Typography>
                                )}
                                {student.hourlyRate && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    💰 {student.hourlyRate} ₽/час
                                  </Typography>
                                )}
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuClick(e, student)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Box>
                            {/* Аккордеон подробностей по ученику */}
                            {(student.notes ||
                              student.createdAt ||
                              student.updatedAt) && (
                              <Accordion
                                sx={{ mt: 2, boxShadow: "none" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AccordionSummary
                                  expandIcon={<ExpandMoreIcon />}
                                  sx={{
                                    minHeight: "auto",
                                    "& .MuiAccordionSummary-content": {
                                      margin: "8px 0",
                                    },
                                  }}
                                >
                                  <Typography variant="body2" color="primary">
                                    Подробности
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 0 }}>
                                  {student.notes && (
                                    <Box mb={1}>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                      >
                                        Заметки:
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {student.notes}
                                      </Typography>
                                    </Box>
                                  )}
                                  <Divider sx={{ my: 1 }} />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Добавлен:{" "}
                                    {new Date(
                                      student.createdAt
                                    ).toLocaleDateString("ru-RU", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Обновлен:{" "}
                                    {new Date(
                                      student.updatedAt
                                    ).toLocaleDateString("ru-RU", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </Typography>
                                </AccordionDetails>
                              </Accordion>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        )}
      </Paper>

      <Fab
        color="primary"
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
        }}
        onClick={() => setIsDialogOpen(true)}
      >
        <AddIcon sx={{ fontSize: 28 }} />
      </Fab>

      <StudentForm
        open={isDialogOpen}
        onClose={handleCloseEditDialog}
        student={editingStudent}
      />

      <StudentViewDialog
        open={isViewDialogOpen}
        onClose={handleCloseViewDialog}
        student={viewingStudent}
        onEdit={handleEditFromView}
        onDelete={handleDeleteFromView}
      />

      <StudentDeleteDialog
        open={Boolean(deleteDialogOpen)}
        onClose={() => setDeleteDialogOpen(null)}
        onConfirm={handleDeleteConfirm}
        student={deleteDialogOpen || undefined}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditFromMenu}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDeleteFromMenu} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>
    </Container>
  );
};
