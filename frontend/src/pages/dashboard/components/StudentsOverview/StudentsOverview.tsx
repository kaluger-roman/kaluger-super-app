import { Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

import type { Student } from "@shared/types";

import * as Styled from "./StudentsOverview.styled";

type StudentsOverviewProps = {
  students: Student[];
};

export const StudentsOverview = ({ students }: StudentsOverviewProps) => {
  const navigate = useNavigate();

  if (students.length === 0) {
    return null;
  }

  return (
    <Styled.Container>
      <Styled.Title variant="h6" gutterBottom>
        👥 Ученики
      </Styled.Title>
      <Styled.StudentsContainer>
        {students.slice(0, 3).map((student) => (
          <Styled.StudentCard key={student.id} variant="outlined">
            <Styled.StudentCardContent>
              <Box>
                <Styled.StudentName variant="subtitle2">{student.name}</Styled.StudentName>
                <Typography variant="body2" color="text.secondary">
                  {student.grade ? `${student.grade} класс` : "Класс не указан"}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="body2">
                  {student.hourlyRate ? `${student.hourlyRate} ₽/урок` : "Ставка не указана"}
                </Typography>
              </Box>
            </Styled.StudentCardContent>
          </Styled.StudentCard>
        ))}
      </Styled.StudentsContainer>
      <Styled.ViewAllButton variant="text" onClick={() => navigate("/students")}>
        Посмотреть всех учеников
      </Styled.ViewAllButton>
    </Styled.Container>
  );
};
