import type { FC } from "react";

import { Box, Typography } from "@mui/material";

import type { Student } from "@shared";

type StudentInfoProps = {
  student: Student;
};

export const StudentInfo: FC<StudentInfoProps> = ({ student }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      👤 {student.name}
    </Typography>
    {student.grade && (
      <Typography variant="body1" color="text.secondary" gutterBottom>
        🎓 {student.grade} класс
      </Typography>
    )}
    {student.hourlyRate && (
      <Typography variant="body1" gutterBottom>
        💰 {student.hourlyRate} ₽/урок
      </Typography>
    )}
  </Box>
);
