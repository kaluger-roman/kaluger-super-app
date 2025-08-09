import React from "react";
import { Box, Typography } from "@mui/material";

type EmptyStateProps = {
  type: "scheduled" | "completed";
};

export const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={8}
      textAlign="center"
    >
      <Typography variant="h5" color="text.secondary" gutterBottom>
        {type === "scheduled"
          ? "📅 Нет запланированных уроков"
          : "📚 Нет прошедших уроков"}
      </Typography>
      <Typography color="text.secondary">
        {type === "scheduled"
          ? 'Добавьте новый урок, нажав на кнопку "+"'
          : "Прошедшие уроки будут отображаться здесь"}
      </Typography>
    </Box>
  );
};
