import type { FC } from "react";

import {
  Save as SaveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
} from "@mui/icons-material";
import { Button, CircularProgress } from "@mui/material";
import { useUnit } from "effector-react";

import { studentsArchiveModel } from "@features/students";

import * as Styled from "./StudentFormActions.styled";
import type { StudentFormActionsProps } from "../types";

export const StudentFormActions: FC<StudentFormActionsProps> = ({
  student,
  isLoading,
  isMobile,
  onClose,
  onDelete,
}) => {
  const actions = useUnit({
    archiveRequested: studentsArchiveModel.archiveRequested,
    unarchiveRequested: studentsArchiveModel.unarchiveRequested,
  });

  return (
    <Styled.Container $isMobile={isMobile}>
      <Styled.LeftActions>
        {student && (
          <>
            {student.archived ? (
              <Button
                onClick={() => actions.unarchiveRequested(student)}
                startIcon={<UnarchiveIcon />}
                color="primary"
                variant="outlined"
                disabled={isLoading}
                fullWidth={isMobile}
              >
                Из архива
              </Button>
            ) : (
              <Button
                onClick={() => actions.archiveRequested(student)}
                startIcon={<ArchiveIcon />}
                color="warning"
                variant="outlined"
                disabled={isLoading}
                fullWidth={isMobile}
              >
                В архив
              </Button>
            )}
            <Button
              onClick={onDelete}
              startIcon={<DeleteIcon />}
              color="error"
              variant="outlined"
              disabled={isLoading}
              fullWidth={isMobile}
            >
              Удалить
            </Button>
          </>
        )}
      </Styled.LeftActions>
      <Styled.RightActions>
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
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          disabled={isLoading}
          fullWidth={isMobile}
        >
          {student ? "Сохранить" : "Добавить"}
        </Button>
      </Styled.RightActions>
    </Styled.Container>
  );
};
