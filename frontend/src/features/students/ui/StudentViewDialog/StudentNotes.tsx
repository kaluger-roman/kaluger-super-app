import type { FC } from "react";

import { Box, Typography } from "@mui/material";

import * as Styled from "./StudentViewDialog.styled";

type StudentNotesProps = {
  notes: string;
};

export const StudentNotes: FC<StudentNotesProps> = ({ notes }) => (
  <Box>
    <Styled.SectionTitle variant="subtitle2">🗒️ Заметки</Styled.SectionTitle>
    <Typography variant="body2" color="text.secondary">
      {notes}
    </Typography>
  </Box>
);
