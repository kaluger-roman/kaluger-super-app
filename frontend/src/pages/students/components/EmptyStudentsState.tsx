import React from "react";
import { Box, Typography } from "@mui/material";

export const EmptyStudentsState: React.FC = () => {
  return (
    <Box p={6} textAlign="center">
      <Typography variant="h5" color="text.secondary" gutterBottom>
        📚 У вас пока нет учеников
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Добавьте первого ученика, нажав на кнопку "+"
      </Typography>
    </Box>
  );
};
