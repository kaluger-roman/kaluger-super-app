import type { FC } from "react";

import { Box } from "@mui/material";

import type { Student } from "@shared";

import * as Styled from "./StudentViewDialog.styled";

type StudentInfoProps = {
  student: Student;
};

export const StudentInfo: FC<StudentInfoProps> = ({ student }) => (
  <Box>
    <Styled.IconRow gutterBottom variant="h6">
      <Styled.SectionEmoji aria-hidden>👤</Styled.SectionEmoji>
      {student.name}
    </Styled.IconRow>
    {student.grade && (
      <Styled.IconRow gutterBottom variant="body1" color="text.secondary">
        <Styled.SectionEmoji aria-hidden>🎓</Styled.SectionEmoji>
        {student.grade} класс
      </Styled.IconRow>
    )}
    {student.hourlyRate != null && student.hourlyRate > 0 && (
      <Styled.IconRow gutterBottom variant="body1">
        <Styled.SectionEmoji aria-hidden>💰</Styled.SectionEmoji>
        {student.hourlyRate} ₽/урок
      </Styled.IconRow>
    )}
  </Box>
);
