import type { FC } from "react";

import {
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { Chip, Typography } from "@mui/material";

import { formatDateTime } from "@shared";

import { getStatusChipColor } from "./CallHistoryList.helpers";
import * as Styled from "./CallHistoryList.styled";
import {
  formatCallDuration,
  getCallDirectionLabel,
  getCallStatusLabel,
} from "../../videoCall.helpers";
import type { CallHistoryRecord } from "../../videoCall.types";

type CallHistoryRowProps = {
  record: CallHistoryRecord;
};

export const CallHistoryRow: FC<CallHistoryRowProps> = ({ record }) => {
  const incoming = record.direction === "incoming";

  return (
    <Styled.RowCard variant="outlined">
      <Styled.DirectionIconBox $incoming={incoming}>
        {incoming ? <CallReceivedIcon /> : <CallMadeIcon />}
      </Styled.DirectionIconBox>

      <Styled.RowMain>
        <Styled.RowTopLine>
          <Styled.PeerName variant="subtitle1">{record.peerName}</Styled.PeerName>
          <Chip
            size="small"
            color={getStatusChipColor(record.status)}
            label={getCallStatusLabel(record.status)}
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
      </Styled.RowMain>
    </Styled.RowCard>
  );
};
