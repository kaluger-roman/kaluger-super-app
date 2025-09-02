import React from "react";
import { Fab } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

type AddLessonFabProps = {
  onClick: () => void;
};

export const AddLessonFab: React.FC<AddLessonFabProps> = ({ onClick }) => {
  return (
    <Fab
      color="primary"
      aria-label="add lesson"
      sx={{
        position: "fixed",
        bottom: 32,
        right: 32,
      }}
      onClick={onClick}
    >
      <AddIcon />
    </Fab>
  );
};
