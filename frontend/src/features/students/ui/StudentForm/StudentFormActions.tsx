import React from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import type { StudentFormActionsProps } from "./types";

export const StudentFormActions: React.FC<StudentFormActionsProps> = ({
  student,
  isLoading,
  isMobile,
  onClose,
  onDelete,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        width: "100%",
        gap: isMobile ? 2 : 0,
      }}
    >
      <Box>
        {student && (
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
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 1,
        }}
      >
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
          startIcon={
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          disabled={isLoading}
          fullWidth={isMobile}
        >
          {student ? "Сохранить" : "Добавить"}
        </Button>
      </Box>
    </Box>
  );
};
