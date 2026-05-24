import type { FC, MouseEvent } from "react";
import { Fragment } from "react";

import { Collapse } from "@mui/material";

import type { Lesson } from "@shared";
import { handleActivationKey } from "@shared";

import type { LessonListType } from "../LessonsList.types";
import { LessonsMonth } from "./LessonsMonth";
import * as Styled from "./LessonsYear.styled";
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
  type: LessonListType;
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
  type,
}) => {
  const sortedMonths = sortMonths(Object.entries(yearData), type);

  return (
    <Fragment>
      <Styled.YearBox
        onClick={onToggleYear}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={`${year}, ${isCollapsed ? "раскрыть" : "свернуть"}`}
        onKeyDown={handleActivationKey(onToggleYear)}
      >
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
              type={type}
            />
          );
        })}
      </Collapse>
    </Fragment>
  );
};
