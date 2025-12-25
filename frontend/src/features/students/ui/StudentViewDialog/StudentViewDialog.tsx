import type { FC } from "react";

import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  DialogTitle,
  DialogContent,
  Box,
  Button,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useUnit } from "effector-react";

import type { Student } from "@shared";
import { StudentDeleteDialog } from "@shared/ui";

import { StudentContacts } from "./StudentContacts";
import { StudentInfo } from "./StudentInfo";
import { StudentMeta } from "./StudentMeta";
import { StudentNotes } from "./StudentNotes";
import * as studentViewDialogModel from "./StudentViewDialog.model";
import * as Styled from "./StudentViewDialog.styled";
import { studentsModel } from "../../models";

type StudentViewDialogProps = {
  open: boolean;
  student?: Student;
};

export const StudentViewDialog: FC<StudentViewDialogProps> = ({ open, student }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const deleteDialogOpen = useUnit(studentViewDialogModel.$deleteDialogOpen);

  const actions = useUnit({
    viewDialogClosed: studentsModel.viewDialogClosed,
    editFromViewRequested: studentsModel.editFromViewRequested,
    deleteFromViewConfirmed: studentsModel.deleteFromViewConfirmed,
  });

  if (!student) return null;

  const handleDelete = () => {
    studentViewDialogModel.deleteDialogOpened();
  };

  const handleDeleteConfirm = () => {
    actions.deleteFromViewConfirmed();
    studentViewDialogModel.deleteDialogClosed();
  };

  const hasContacts = student.contactMethod || student.phone || student.parentPhone;

  return (
    <>
      <Styled.StyledDialog
        open={open}
        onClose={actions.viewDialogClosed}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        $isMobile={isMobile}
      >
        <DialogTitle>
          <Typography variant="h6">Ученик</Typography>
        </DialogTitle>

        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            <StudentInfo student={student} />

            {hasContacts && <Divider />}
            {hasContacts && <StudentContacts student={student} />}

            {student.notes && <Divider />}
            {student.notes && <StudentNotes notes={student.notes} />}

            <Divider />
            <StudentMeta createdAt={student.createdAt} updatedAt={student.updatedAt} />
          </Box>
        </DialogContent>

        <Styled.ActionsContainer $isMobile={isMobile}>
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
          <Styled.ActionsRight $isMobile={isMobile}>
            <Button onClick={actions.viewDialogClosed} variant="outlined" fullWidth={isMobile}>
              Закрыть
            </Button>
            <Button
              onClick={actions.editFromViewRequested}
              variant="contained"
              startIcon={<EditIcon />}
              fullWidth={isMobile}
            >
              Редактировать
            </Button>
          </Styled.ActionsRight>
        </Styled.ActionsContainer>
      </Styled.StyledDialog>

      <StudentDeleteDialog
        open={deleteDialogOpen}
        onClose={studentViewDialogModel.deleteDialogClosed}
        onConfirm={handleDeleteConfirm}
        student={student}
      />
    </>
  );
};
