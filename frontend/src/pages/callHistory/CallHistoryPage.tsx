import type { FC } from "react";

import { VideoCall as VideoCallIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { callHistoryModel } from "@entities";
import type { CallHistoryPrincipal } from "@entities";
import { CallHistoryList } from "@features";

import * as Styled from "./CallHistoryPage.styled";

type CallHistoryPageProps = {
  principal: CallHistoryPrincipal;
};

export const CallHistoryPage: FC<CallHistoryPageProps> = ({ principal }) => {
  useGate(callHistoryModel.CallHistoryGate, principal);
  const { records, loadFailed, loading, refresh } = useUnit({
    records: callHistoryModel.$callHistory,
    loadFailed: callHistoryModel.$loadFailed,
    loading: callHistoryModel.$isLoading,
    refresh: callHistoryModel.refreshRequested,
  });

  return (
    <Styled.StyledContainer maxWidth="md">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h4">
          <Styled.TitleIcon aria-hidden>
            <VideoCallIcon fontSize="inherit" />
          </Styled.TitleIcon>
          История звонков
        </Styled.StyledTitle>
        <Typography variant="body1" color="text.secondary">
          Ваши видеозвонки
        </Typography>
      </Styled.HeaderBox>

      <Styled.StyledPaper>
        <CallHistoryList
          records={records}
          loadFailed={loadFailed}
          loading={loading}
          onRetry={() => refresh()}
        />
      </Styled.StyledPaper>
    </Styled.StyledContainer>
  );
};
