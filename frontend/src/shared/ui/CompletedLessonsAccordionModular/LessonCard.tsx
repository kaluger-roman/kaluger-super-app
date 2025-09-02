import { Card, CardContent, Typography, Chip, IconButton, Box } from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import { LessonCardProps } from "./types";
import { getStatusColor, getStatusText } from "./utils";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../../types";
import { formatDateTime } from "../../lib/date";

export const LessonCard = ({ lesson, onMenuClick }: LessonCardProps) => {
  return (
    <Card sx={{ mb: 1 }}>
      <CardContent
        sx={{
          py: 1.5,
          "&:last-child": { pb: 1.5 },
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box flex={1}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600 }}
            >
              {SUBJECT_LABELS[lesson.subject]} • {LESSON_TYPE_LABELS[lesson.lessonType]}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
            >
              {lesson.student?.name} • {formatDateTime(new Date(lesson.startTime))}
              {lesson.price && ` • ${lesson.price} ₽`}
            </Typography>
          </Box>
          <Box
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Chip
              label={getStatusText(lesson.status)}
              color={getStatusColor(lesson.status) as any}
              size="small"
            />
            <IconButton
              size="small"
              onClick={(e) => onMenuClick(e, lesson)}
            >
              <MoreVert />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
