import type { FC } from "react";

import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Menu } from "@mui/material";

import * as Styled from "./StudentsMenu.styled";

type StudentsMenuProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const StudentsMenu: FC<StudentsMenuProps> = ({ anchorEl, onClose, onEdit, onDelete }) => {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <Styled.StyledMenuItem onClick={onEdit}>
        <EditIcon />
        Редактировать
      </Styled.StyledMenuItem>
      <Styled.StyledDeleteMenuItem onClick={onDelete}>
        <DeleteIcon />
        Удалить
      </Styled.StyledDeleteMenuItem>
    </Menu>
  );
};
