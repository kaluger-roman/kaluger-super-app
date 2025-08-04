import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Student, formatCurrency } from "../../../shared";
import { removeStudent } from "../model/student";
import { showSuccess, showError } from "../../../shared/model/notifications";
import { StudentForm } from "../../../features/students";

type StudentCardProps = {
  student: Student;
  onClick?: () => void;
};

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onClick,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    try {
      removeStudent(student.id);
      showSuccess(`Ученик ${student.name} удален`);
      setDeleteDialogOpen(false);
    } catch (error) {
      showError("Ошибка при удалении ученика");
    }
  };

  return (
    <>
      <Card
        sx={{
          cursor: onClick ? "pointer" : "default",
          "&:hover": onClick ? { boxShadow: 3 } : {},
          position: "relative",
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box flex={1}>
              <Typography variant="h6" component="h3" gutterBottom>
                {student.name}
              </Typography>

              {student.email && (
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {student.email}
                </Typography>
              )}

              {student.phone && (
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {student.phone}
                </Typography>
              )}

              {student.grade && (
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {student.grade} класс
                </Typography>
              )}
            </Box>

            <IconButton size="small" onClick={handleMenuClick} sx={{ ml: 1 }}>
              <MoreIcon />
            </IconButton>
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mt={2}
          >
            {student.hourlyRate && (
              <Chip
                label={formatCurrency(student.hourlyRate)}
                color="primary"
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <StudentForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        student={student}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Удалить ученика</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить ученика{" "}
            <strong>{student.name}</strong>? Это действие нельзя будет отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
