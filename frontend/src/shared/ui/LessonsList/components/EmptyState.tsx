import React from "react";
import { Box, Typography } from "@mui/material";

type EmptyStateProps = {
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
};

export const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case "scheduled":
        return {
          title: "📅 Нет запланированных уроков",
          description: 'Добавьте новый урок, нажав на кнопку "+"',
        };
      case "completed":
        return {
          title: "📚 Нет прошедших уроков",
          description: "Прошедшие уроки будут отображаться здесь",
        };
      case "cancelled":
        return {
          title: "❌ Нет отмененных уроков",
          description: "Отмененные уроки будут отображаться здесь",
        };
      case "rescheduled":
        return {
          title: "📆 Нет перенесенных уроков",
          description: "Перенесенные уроки будут отображаться здесь",
        };
      default:
        return {
          title: "📋 Нет уроков",
          description: "Уроки будут отображаться здесь",
        };
    }
  };

  const { title, description } = getEmptyStateContent();

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
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Box>
  );
};
