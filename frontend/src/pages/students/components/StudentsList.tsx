import React from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { StudentCard } from "./StudentCard";
import type { Student } from "../../../shared";

type StudentsListProps = {
  students: Student[];
  onStudentClick: (student: Student) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, student: Student) => void;
};

export const StudentsList: React.FC<StudentsListProps> = ({
  students,
  onStudentClick,
  onMenuClick,
}) => {
  // Группируем студентов по классам
  const studentsByGrade = students.reduce<Record<string, Student[]>>(
    (acc, student) => {
      const grade = student.grade ? `${student.grade} класс` : "Без класса";
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student);
      return acc;
    },
    {}
  );

  // Сортируем группы
  const sortedGrades = Object.entries(studentsByGrade).sort((a, b) => {
    if (a[0] === "Без класса") return 1;
    if (b[0] === "Без класса") return -1;
    return parseInt(a[0]) - parseInt(b[0]);
  });

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {sortedGrades.map(([grade, studentsInGrade]) => (
        <Accordion key={grade} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {grade} ({studentsInGrade.length}{" "}
              {studentsInGrade.length === 1 ? "ученик" : "учеников"})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexDirection="column" gap={2}>
              {studentsInGrade.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onStudentClick={onStudentClick}
                  onMenuClick={onMenuClick}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
