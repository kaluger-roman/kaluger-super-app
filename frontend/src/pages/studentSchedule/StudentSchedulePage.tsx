import type { FC } from "react";

import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { Alert, Button, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import { StudentWeeklyView, formatRangeLabel, studentScheduleModel } from "@features";

import * as Styled from "./StudentSchedulePage.styled";

export const StudentSchedulePage: FC = () => {
  const weekStart = useUnit(studentScheduleModel.$weekStart);
  const lessons = useUnit(studentScheduleModel.$lessons);
  const loadError = useUnit(studentScheduleModel.$loadError);

  return (
    <Styled.RootBox>
      <Styled.Toolbar>
        <Typography variant="h5" component="h1" fontWeight={600}>
          Расписание
        </Typography>
        <Styled.PaginationGroup>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ChevronLeftIcon />}
            onClick={() => studentScheduleModel.previousWeek()}
          >
            Назад
          </Button>
          <Button variant="text" size="small" onClick={() => studentScheduleModel.todayClicked()}>
            Сегодня
          </Button>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ChevronRightIcon />}
            onClick={() => studentScheduleModel.nextWeek()}
          >
            Вперёд
          </Button>
        </Styled.PaginationGroup>
      </Styled.Toolbar>

      <Typography variant="subtitle2" color="text.secondary">
        {formatRangeLabel(weekStart)}
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <StudentWeeklyView lessons={lessons} />
    </Styled.RootBox>
  );
};
