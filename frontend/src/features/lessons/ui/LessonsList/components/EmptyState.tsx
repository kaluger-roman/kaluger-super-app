import type { FC } from "react";

import type { LessonListType } from "../LessonsList.types";
import * as Styled from "./EmptyState.styled";

type EmptyStateProps = {
  type: LessonListType;
};

export const EmptyState: FC<EmptyStateProps> = ({ type }) => {
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
      case "all":
        return {
          title: "📋 Нет уроков с оплатой в выбранный период",
          description: "Попробуйте изменить диапазон дат в фильтре",
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
    <Styled.Container>
      <Styled.Title variant="h5" color="text.secondary" gutterBottom>
        {title}
      </Styled.Title>
      <Styled.Description color="text.secondary">{description}</Styled.Description>
    </Styled.Container>
  );
};
