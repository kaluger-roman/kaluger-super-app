import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { Lesson, SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../../../types";
import { RecurringLessonBadge } from "../../RecurringLessonBadge";
import { PaymentStatus } from "../../PaymentStatus";
import {
  formatTime,
  getStatusColor,
  getStatusLabel,
} from "../utils/lessonUtils";

type LessonCardProps = {
  lesson: Lesson;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
};

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  onCardClick,
  onMenuClick,
  onPaymentChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: 2,
          transform: "translateY(-1px)",
        },
      }}
      onClick={() => onCardClick(lesson)}
    >
      <CardContent sx={{ py: 2 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box flex={1}>
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              mb={1}
              flexWrap="wrap"
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {lesson.student?.name}
              </Typography>
              <Chip
                label={getStatusLabel(lesson.status)}
                color={getStatusColor(lesson.status)}
                size="small"
              />
              {lesson.isRecurring && (
                <RecurringLessonBadge size="small" variant="chip" />
              )}
            </Box>

            <Box
              display="flex"
              alignItems="center"
              gap={3}
              mb={1}
              flexWrap="wrap"
            >
              <Typography variant="body2" color="text.secondary">
                ⏰ {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                💰 {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
              </Typography>
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              flexDirection={isMobile ? "column" : "row"}
              alignItems={isMobile ? "flex-start" : "center"}
              gap={1}
            >
              <Typography variant="body2" color="text.secondary">
                📚 {SUBJECT_LABELS[lesson.subject]} •{" "}
                {LESSON_TYPE_LABELS[lesson.lessonType]}
              </Typography>

              <Box
                sx={{
                  minWidth: "fit-content",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <PaymentStatus
                  lesson={lesson}
                  onPaymentChange={onPaymentChange}
                />
              </Box>
            </Box>
          </Box>

          <IconButton size="small" onClick={(e) => onMenuClick(e, lesson)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};
