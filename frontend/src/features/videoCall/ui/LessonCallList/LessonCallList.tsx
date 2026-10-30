import type { FC } from "react";

import { Box } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { lessonCallsModel } from "@entities";

import * as Styled from "./LessonCallList.styled";
import { LessonCallRow } from "./LessonCallRow";

type LessonCallListProps = {
  lessonId: string;
};

export const LessonCallList: FC<LessonCallListProps> = ({ lessonId }) => {
  useGate(lessonCallsModel.LessonCallsGate, lessonId);
  const calls = useUnit(lessonCallsModel.$lessonCalls);

  if (calls.length === 0) return null;

  return (
    <Box>
      <Styled.SectionTitle variant="subtitle2">📞 Звонки по уроку</Styled.SectionTitle>
      <Styled.List role="list" aria-label="Звонки по уроку">
        {calls.map((call) => (
          <LessonCallRow key={call.id} call={call} />
        ))}
      </Styled.List>
    </Box>
  );
};
