import React from "react";
import { Menu, MenuItem } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";

type StudentsMenuProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const StudentsMenu: React.FC<StudentsMenuProps> = ({
  anchorEl,
  onClose,
  onEdit,
  onDelete,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <MenuItem onClick={onEdit}>
        <EditIcon sx={{ mr: 1 }} />
        Редактировать
      </MenuItem>
      <MenuItem onClick={onDelete} sx={{ color: "error.main" }}>
        <DeleteIcon sx={{ mr: 1 }} />
        Удалить
      </MenuItem>
    </Menu>
  );
};
