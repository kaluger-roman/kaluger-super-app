import type { FC, ReactNode } from "react";

import { Box, Chip, Typography } from "@mui/material";

import * as Styled from "./StudentName.styled";
import type { Student } from "../../types";

type StudentNameProps = {
  student?: Pick<Student, "name" | "archived"> | null;
  variant?: "body1" | "body2" | "h6" | "subtitle1" | "subtitle2" | "caption";
  showArchived?: boolean;
  component?: ReactNode;
};

export const StudentName: FC<StudentNameProps> = ({
  student,
  variant = "body1",
  showArchived = true,
  component,
}) => {
  if (!student) return null;

  if (component) {
    return (
      <>
        {component}
        {showArchived && student.archived && (
          <Styled.ArchivedChip label="Архив" size="small" color="default" />
        )}
      </>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Typography variant={variant}>{student.name}</Typography>
      {showArchived && student.archived && <Chip label="Архив" size="small" color="default" />}
    </Box>
  );
};
