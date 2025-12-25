import type { FC } from "react";

import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";

import type { Student } from "@shared";

import { StudentCard } from "../StudentCard";
import { groupStudentsByGrade, sortGrades } from "./StudentsList.helpers";
import * as Styled from "./StudentsList.styled";

type StudentsListProps = {
  students: Student[];
};

export const StudentsList: FC<StudentsListProps> = ({ students }) => {
  const studentsByGrade = groupStudentsByGrade(students);
  const sortedGrades = sortGrades(studentsByGrade);

  return (
    <Styled.Container>
      {sortedGrades.map(([grade, studentsInGrade]) => (
        <Accordion key={grade} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Styled.GradeTitle variant="h6">
              {grade} ({studentsInGrade.length}{" "}
              {studentsInGrade.length === 1 ? "ученик" : "учеников"})
            </Styled.GradeTitle>
          </AccordionSummary>
          <AccordionDetails>
            <Styled.StudentsContainer>
              {studentsInGrade.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
            </Styled.StudentsContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Styled.Container>
  );
};
