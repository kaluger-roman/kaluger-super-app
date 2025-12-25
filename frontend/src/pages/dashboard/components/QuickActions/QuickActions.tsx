import {
  School as SchoolIcon,
  Group as GroupIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import * as Styled from "./QuickActions.styled";

type QuickActionsProps = {
  studentsCount: number;
};

export const QuickActions = ({ studentsCount }: QuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <Styled.Container>
      <Styled.ActionCard onClick={() => navigate("/lessons")}>
        <Styled.ActionCardContent>
          <Styled.ActionIcon as={SchoolIcon} color="primary" />
          <Styled.ActionTitle variant="h6">Уроки</Styled.ActionTitle>
        </Styled.ActionCardContent>
      </Styled.ActionCard>
      <Styled.ActionCard onClick={() => navigate("/students")}>
        <Styled.ActionCardContent>
          <Styled.ActionIcon as={GroupIcon} color="success" />
          <Styled.ActionTitle variant="h6">Ученики</Styled.ActionTitle>
          <Typography variant="body2" color="text.secondary">
            {studentsCount} всего
          </Typography>
        </Styled.ActionCardContent>
      </Styled.ActionCard>
      <Styled.ActionCard onClick={() => navigate("/reports")}>
        <Styled.ActionCardContent>
          <Styled.ActionIcon as={CalendarIcon} color="info" />
          <Styled.ActionTitle variant="h6">Отчеты</Styled.ActionTitle>
          <Typography variant="body2" color="text.secondary">
            Статистика
          </Typography>
        </Styled.ActionCardContent>
      </Styled.ActionCard>
      <Styled.NewLessonCard onClick={() => navigate("/lessons")}>
        <Styled.NewLessonCardContent>
          <Styled.NewLessonIcon as={AddIcon} />
          <Styled.NewLessonTitle variant="h6">Новый урок</Styled.NewLessonTitle>
          <Styled.NewLessonSubtitle variant="body2">Создать</Styled.NewLessonSubtitle>
        </Styled.NewLessonCardContent>
      </Styled.NewLessonCard>
    </Styled.Container>
  );
};
