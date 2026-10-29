import type { FC } from "react";

import {
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  MenuBook as MenuBookIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { Chip, Typography } from "@mui/material";

import type { CallHistoryRecord } from "@entities";
import { formatDateTime } from "@shared";

import { getStatusChipColor } from "./CallHistoryList.helpers";
import * as Styled from "./CallHistoryList.styled";
import {
  formatCallDuration,
  formatCallLesson,
  getCallDirectionLabel,
  getCallStatusLabel,
} from "../../videoCall.helpers";

type CallHistoryRowProps = {
  record: CallHistoryRecord;
};

export const CallHistoryRow: FC<CallHistoryRowProps> = ({ record }) => {
  const incoming = record.direction === "incoming";

  return (
    <Styled.RowCard variant="outlined" role="listitem">
      <Styled.DirectionIconBox $incoming={incoming}>
        {incoming ? <CallReceivedIcon /> : <CallMadeIcon />}
      </Styled.DirectionIconBox>

      <Styled.RowMain>
        <Styled.RowTopLine>
          <Styled.PeerName variant="subtitle1">{record.peerName}</Styled.PeerName>
          <Chip
            size="small"
            color={getStatusChipColor(record.status, record.direction)}
            label={getCallStatusLabel(record.status, record.direction)}
          />
        </Styled.RowTopLine>

        <Styled.RowMeta>
          <Typography variant="body2" color="text.secondary">
            {getCallDirectionLabel(record.direction)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(record.startedAt)}
          </Typography>
          {record.durationSeconds != null && (
            <Styled.Duration variant="body2" color="text.secondary">
              <ScheduleIcon fontSize="inherit" />
              {formatCallDuration(record.durationSeconds)}
            </Styled.Duration>
          )}
        </Styled.RowMeta>

        {record.lesson && (
          <Styled.LessonLine variant="body2">
            <MenuBookIcon fontSize="inherit" />
            Урок: {formatCallLesson(record.lesson)}
          </Styled.LessonLine>
        )}
      </Styled.RowMain>
    </Styled.RowCard>
  );
};
