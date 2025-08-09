import React, { Fragment } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Lesson } from "../../../types";
import { LessonsDay } from "./LessonsDay";

type LessonsMonthProps = {
  month: string;
  monthData: { [day: string]: Lesson[] };
  isCollapsed: boolean;
  onToggle: () => void;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  type: "scheduled" | "completed";
};

export const LessonsMonth: React.FC<LessonsMonthProps> = ({
  month,
  monthData,
  isCollapsed,
  onToggle,
  onCardClick,
  onMenuClick,
  onPaymentChange,
  type,
}) => {
  return (
    <Fragment>
      <Box
        display="flex"
        alignItems="center"
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          background: "linear-gradient(135deg, #42a5f5 0%, #7e57c2 100%)",
          cursor: "pointer",
          boxShadow: 1,
          transition: "all 0.2s ease",
          "&:hover": {
            boxShadow: 2,
            transform: "translateY(-1px)",
            background: "linear-gradient(135deg, #1976d2 0%, #512da8 100%)",
          },
        }}
        onClick={onToggle}
      >
        <Typography
          variant="h6"
          sx={{
            flex: 1,
            fontWeight: 600,
            color: "white",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          📅&nbsp;&nbsp;&nbsp;{month}
        </Typography>
        {isCollapsed ? (
          <ExpandMore sx={{ color: "white" }} />
        ) : (
          <ExpandLess sx={{ color: "white" }} />
        )}
      </Box>
      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
        {Object.entries(monthData).map(([day, dayLessons]) => (
          <LessonsDay
            key={day}
            day={day}
            lessons={dayLessons}
            onCardClick={onCardClick}
            onMenuClick={onMenuClick}
            onPaymentChange={onPaymentChange}
          />
        ))}
      </Collapse>
    </Fragment>
  );
};
