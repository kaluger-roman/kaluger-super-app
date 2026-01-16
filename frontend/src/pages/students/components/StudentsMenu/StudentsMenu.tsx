import type { FC } from "react";

import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
} from "@mui/icons-material";
import { Menu } from "@mui/material";
import { useUnit } from "effector-react";

import { studentsModel, studentsArchiveModel } from "@features/students";

import * as Styled from "./StudentsMenu.styled";

type StudentsMenuProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const StudentsMenu: FC<StudentsMenuProps> = ({ anchorEl, onClose, onEdit, onDelete }) => {
  const selectedStudent = useUnit(studentsModel.$selectedStudent);
  const isArchived = selectedStudent?.archived;

  const actions = useUnit({
    archiveRequested: studentsArchiveModel.archiveRequested,
    unarchiveRequested: studentsArchiveModel.unarchiveRequested,
  });

  const withClose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <Styled.StyledMenuItem onClick={() => withClose(onEdit)}>
        <EditIcon />
        Редактировать
      </Styled.StyledMenuItem>
      {isArchived ? (
        <Styled.StyledMenuItem
          onClick={() => withClose(() => actions.unarchiveRequested(selectedStudent))}
        >
          <UnarchiveIcon />
          Из архива
        </Styled.StyledMenuItem>
      ) : (
        <Styled.StyledMenuItem
          onClick={() =>
            withClose(() => selectedStudent && actions.archiveRequested(selectedStudent))
          }
        >
          <ArchiveIcon />В архив
        </Styled.StyledMenuItem>
      )}
      <Styled.StyledDeleteMenuItem onClick={() => withClose(() => onDelete())}>
        <DeleteIcon />
        Удалить
      </Styled.StyledDeleteMenuItem>
    </Menu>
  );
};
