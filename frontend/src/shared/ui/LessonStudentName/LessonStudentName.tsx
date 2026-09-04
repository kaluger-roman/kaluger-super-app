import type { FC, ReactNode } from "react";

import { Box, Chip, Typography } from "@mui/material";

import type { Lesson } from "../../types";
import { StudentName } from "../StudentName";

type LessonStudentNameProps = {
  lesson: Pick<Lesson, "student" | "prospectName">;
  variant?: "body1" | "body2" | "h6" | "subtitle1" | "subtitle2" | "caption";
  component?: ReactNode;
};

export const LessonStudentName: FC<LessonStudentNameProps> = ({
  lesson,
  variant = "body1",
  component,
}) => {
  if (lesson.student) {
    return <StudentName student={lesson.student} variant={variant} component={component} />;
  }

  return (
    <Box display="flex" alignItems="center" gap={1}>
      {component ?? <Typography variant={variant}>{lesson.prospectName}</Typography>}
      <Chip label="Пробный" size="small" color="info" />
    </Box>
  );
};
