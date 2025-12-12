import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import type { Lesson } from "../../../shared";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../../../shared";

type LessonCellProps = {
  lesson: Lesson;
  onClick: (lesson: Lesson) => void;
  compact?: boolean;
};

const LessonCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== "status" && prop !== "compact",
})<{
  status: Lesson["status"];
  compact?: boolean;
}>(({ theme, status, compact }) => {
  const getStatusColor = () => {
    switch (status) {
      case "SCHEDULED":
        return {
          background: theme.palette.primary.light,
          border: `1px solid ${theme.palette.primary.main}`,
          color: theme.palette.primary.contrastText,
        };
      case "COMPLETED":
        return {
          background: theme.palette.success.light,
          border: `1px solid ${theme.palette.success.main}`,
          color: theme.palette.success.contrastText,
        };
      case "CANCELLED":
        return {
          background: theme.palette.error.light,
          border: `1px solid ${theme.palette.error.main}`,
          color: theme.palette.error.contrastText,
        };
      case "RESCHEDULED":
        return {
          background: theme.palette.warning.light,
          border: `1px solid ${theme.palette.warning.main}`,
          color: theme.palette.warning.contrastText,
        };
      case "IN_PROGRESS":
        return {
          background: theme.palette.info.light,
          border: `1px solid ${theme.palette.info.main}`,
          color: theme.palette.info.contrastText,
        };
      default:
        return {
          background: theme.palette.grey[100],
          border: `1px solid ${theme.palette.grey[300]}`,
          color: theme.palette.text.primary,
        };
    }
  };

  const base = {
    ...getStatusColor(),
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    height: "100%",
    margin: "2px",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: theme.shadows[2],
    },
  } as any;

  if (compact) {
    return {
      ...base,
      margin: "1px",
      height: "calc(100% - 3px)",
      padding: "0px 4px",
      borderRadius: "4px",
      minHeight: "24px",
      display: "flex",
      flexDirection: "row",
      gap: theme.spacing(0.5),
      alignItems: "center",
    };
  }

  return {
    ...base,
    padding: theme.spacing(1),
    minHeight: "110px",
    height: "calc(100% - 6px)",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
  };
});

const getStatusLabel = (status: Lesson["status"]) => {
  switch (status) {
    case "SCHEDULED":
      return "Запланирован";
    case "COMPLETED":
      return "Завершен";
    case "CANCELLED":
      return "Отменен";
    case "RESCHEDULED":
      return "Перенесен";
    case "IN_PROGRESS":
      return "В процессе";
    default:
      return "";
  }
};

export const LessonCell: React.FC<LessonCellProps> = ({
  lesson,
  onClick,
  compact = false,
}) => {
  const startTime = new Date(lesson.startTime);
  const endTime = new Date(lesson.endTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (compact) {
    return (
      <LessonCard
        status={lesson.status}
        compact
        onClick={() => onClick(lesson)}
      >
        <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
          {lesson.price ? `${lesson.price}₽ ` : ""}
          {lesson.student?.name}
        </Typography>
      </LessonCard>
    );
  }

  return (
    <LessonCard status={lesson.status} onClick={() => onClick(lesson)}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography variant="caption" fontWeight="bold">
          {formatTime(startTime)}-{formatTime(endTime)}
        </Typography>
        <Chip
          label={getStatusLabel(lesson.status)}
          size="small"
          variant="outlined"
          sx={{
            fontSize: "10px",
            height: "16px",
            "& .MuiChip-label": {
              padding: "0 4px",
            },
          }}
        />
      </Box>

      <Typography variant="body2" fontWeight="medium" noWrap>
        {lesson.student?.name}
      </Typography>

      <Typography variant="caption" noWrap>
        {SUBJECT_LABELS[lesson.subject]} •{" "}
        {LESSON_TYPE_LABELS[lesson.lessonType]}
      </Typography>

      {lesson.price && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt="auto"
        >
          <Typography variant="caption" fontWeight="bold">
            {lesson.price}₽
          </Typography>
          {!lesson.isPaid && (
            <Chip
              label="Не оплачен"
              size="small"
              color="error"
              variant="outlined"
              sx={{
                fontSize: "9px",
                height: "14px",
                "& .MuiChip-label": {
                  padding: "0 3px",
                },
              }}
            />
          )}
        </Box>
      )}
    </LessonCard>
  );
};
