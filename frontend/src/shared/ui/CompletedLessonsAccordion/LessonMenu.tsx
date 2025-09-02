import { Menu, MenuItem } from "@mui/material";
import { LessonMenuProps } from "./types";

export const LessonMenu = ({
  anchorEl,
  selectedLesson,
  onClose,
  onEdit,
  onDelete,
}: LessonMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl) && Boolean(selectedLesson)}
      onClose={onClose}
      transformOrigin={{ horizontal: "right", vertical: "top" }}
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
    >
      <MenuItem onClick={onEdit}>Редактировать</MenuItem>
      <MenuItem onClick={onDelete} sx={{ color: "error.main" }}>
        Удалить
      </MenuItem>
    </Menu>
  );
};
