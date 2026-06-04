import type { FC } from "react";

import { Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { callHistoryModel } from "@entities";
import { CallHistoryList } from "@features";

import * as Styled from "./CallHistoryPage.styled";

export const CallHistoryPage: FC = () => {
  useGate(callHistoryModel.CallHistoryGate);
  const records = useUnit(callHistoryModel.$callHistory);

  return (
    <Styled.StyledContainer maxWidth="md">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h4">
          <Styled.TitleIcon aria-hidden>📞</Styled.TitleIcon>
          История звонков
        </Styled.StyledTitle>
        <Typography variant="body1" color="text.secondary">
          Ваши видеозвонки
        </Typography>
      </Styled.HeaderBox>

      <Styled.StyledPaper>
        <CallHistoryList records={records} />
      </Styled.StyledPaper>
    </Styled.StyledContainer>
  );
};
