import type { FC } from "react";

import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useUnit } from "effector-react";

import { lessonsModel, formatWeekRange } from "@features";

import * as Styled from "./WeekPagination.styled";

export const WeekPagination: FC = () => {
  const currentWeek = useUnit(lessonsModel.$currentWeek);

  return (
    <Styled.Container>
      <IconButton
        aria-label="Предыдущая неделя"
        onClick={() => lessonsModel.goToPrevWeek()}
        size="small"
      >
        <ChevronLeft />
      </IconButton>

      <Styled.WeekText variant="body1">{formatWeekRange(currentWeek)}</Styled.WeekText>

      <IconButton
        aria-label="Следующая неделя"
        onClick={() => lessonsModel.goToNextWeek()}
        size="small"
      >
        <ChevronRight />
      </IconButton>
    </Styled.Container>
  );
};
