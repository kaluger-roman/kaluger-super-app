import type { FC } from "react";

import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
} from "@mui/icons-material";
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
import { InvitationManager } from "../../../tutorStudentInvitation";
import { studentsModel, studentsArchiveModel } from "../../models";

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
    archiveRequested: studentsArchiveModel.archiveRequested,
    unarchiveRequested: studentsArchiveModel.unarchiveRequested,
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
            <InvitationManager studentId={student.id} />

            <Divider />
            <StudentMeta
              createdAt={student.createdAt}
              updatedAt={student.updatedAt}
              archived={student.archived}
              archivedAt={student.archivedAt}
              archiveReason={student.archiveReason}
              archiveComment={student.archiveComment}
            />
          </Box>
        </DialogContent>

        <Styled.ActionsContainer $isMobile={isMobile}>
          <Styled.ActionsLeft>
            {student.archived ? (
              <Button
                onClick={() => actions.unarchiveRequested(student)}
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<UnarchiveIcon />}
                fullWidth={isMobile}
              >
                Из архива
              </Button>
            ) : (
              <Button
                onClick={() => actions.archiveRequested(student)}
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<ArchiveIcon />}
                fullWidth={isMobile}
              >
                В архив
              </Button>
            )}
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
          </Styled.ActionsLeft>
          <Styled.ActionsRight>
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
