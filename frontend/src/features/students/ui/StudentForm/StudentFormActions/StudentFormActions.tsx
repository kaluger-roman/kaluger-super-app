import type { FC } from "react";

import { Save as SaveIcon, Close as CloseIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Box, Button, CircularProgress } from "@mui/material";

import * as Styled from "./StudentFormActions.styled";
import type { StudentFormActionsProps } from "../types";

export const StudentFormActions: FC<StudentFormActionsProps> = ({
  student,
  isLoading,
  isMobile,
  onClose,
  onDelete,
}) => {
  return (
    <Styled.Container $isMobile={isMobile}>
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
      <Styled.RightActions $isMobile={isMobile}>
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
