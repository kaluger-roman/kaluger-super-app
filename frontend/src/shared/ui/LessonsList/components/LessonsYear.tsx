import type { FC, MouseEvent } from "react";
import { Fragment } from "react";

import { Collapse } from "@mui/material";


import { LessonsMonth } from "./LessonsMonth";
import * as Styled from "./LessonsYear.styled";
import type { Lesson } from "../../../types";
import { sortMonths } from "../LessonsList.helpers";

type LessonsYearProps = {
  year: string;
  yearData: { [month: string]: { [day: string]: Lesson[] } };
  isCollapsed: boolean;
  collapsedMonths: Record<string, boolean>;
  onToggleYear: () => void;
  onToggleMonth: (month: string) => void;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
};

export const LessonsYear: FC<LessonsYearProps> = ({
  year,
  yearData,
  isCollapsed,
  collapsedMonths,
  onToggleYear,
  onToggleMonth,
  onCardClick,
  onMenuClick,
  onPaymentChange,
  onHomeworkSentChange,
  type,
}) => {
  const sortedMonths = sortMonths(Object.entries(yearData), type);

  return (
    <Fragment>
      <Styled.YearBox onClick={onToggleYear}>
        <Styled.YearText variant="h5">{year}</Styled.YearText>
        {isCollapsed ? <Styled.WhiteExpandMore /> : <Styled.WhiteExpandLess />}
      </Styled.YearBox>
      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
        {sortedMonths.map(([month, monthData]) => {
          const monthKey = `${year}_${month}`;
          const isMonthCollapsed = collapsedMonths[monthKey] ?? false;

          return (
            <LessonsMonth
              key={month}
              month={month}
              monthData={monthData}
              isCollapsed={isMonthCollapsed}
              onToggle={() => onToggleMonth(month)}
              onCardClick={onCardClick}
              onMenuClick={onMenuClick}
              onPaymentChange={onPaymentChange}
              onHomeworkSentChange={onHomeworkSentChange}
              type={type}
            />
          );
        })}
      </Collapse>
    </Fragment>
  );
};
