import React, { Fragment } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Lesson } from "../../../types";
import { LessonsMonth } from "./LessonsMonth";
import { sortMonths } from "../utils/lessonUtils";

type LessonsYearProps = {
  year: string;
  yearData: { [month: string]: { [day: string]: Lesson[] } };
  isCollapsed: boolean;
  collapsedMonths: Record<string, boolean>;
  onToggleYear: () => void;
  onToggleMonth: (month: string) => void;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  type: "scheduled" | "completed";
};

export const LessonsYear: React.FC<LessonsYearProps> = ({
  year,
  yearData,
  isCollapsed,
  collapsedMonths,
  onToggleYear,
  onToggleMonth,
  onCardClick,
  onMenuClick,
  onPaymentChange,
  type,
}) => {
  const sortedMonths = sortMonths(Object.entries(yearData), type);

  return (
    <Fragment>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          cursor: "pointer",
          mb: 3,
          p: 2,
          borderRadius: 2,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          boxShadow: 2,
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: 4,
            transform: "translateY(-2px)",
          },
        }}
        onClick={onToggleYear}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            mr: 1,
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {year}
        </Typography>
        {isCollapsed ? (
          <ExpandMore sx={{ color: "white" }} />
        ) : (
          <ExpandLess sx={{ color: "white" }} />
        )}
      </Box>
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
              type={type}
            />
          );
        })}
      </Collapse>
    </Fragment>
  );
};
