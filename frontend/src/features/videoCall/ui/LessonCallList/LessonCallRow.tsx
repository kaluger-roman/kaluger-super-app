import type { FC } from "react";

import {
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { Chip, Typography } from "@mui/material";

import type { CallHistoryRecord } from "@entities";
import { formatDateTime } from "@shared";

import {
  formatCallDuration,
  getCallDirectionLabel,
  getCallStatusLabel,
} from "../../videoCall.helpers";
import { getStatusChipColor } from "../CallHistoryList";
import * as Styled from "./LessonCallList.styled";

type LessonCallRowProps = {
  call: CallHistoryRecord;
};

export const LessonCallRow: FC<LessonCallRowProps> = ({ call }) => (
  <Styled.Row role="listitem">
    <Styled.RowMain>
      {call.direction === "incoming" ? (
        <CallReceivedIcon fontSize="small" color="primary" />
      ) : (
        <CallMadeIcon fontSize="small" />
      )}
      <Typography variant="body2" color="text.primary">
        {getCallDirectionLabel(call.direction)}
      </Typography>
      <Typography variant="body2">{formatDateTime(call.startedAt)}</Typography>
    </Styled.RowMain>
    <Styled.RowSide>
      <Chip
        size="small"
        color={getStatusChipColor(call.status, call.direction)}
        label={getCallStatusLabel(call.status, call.direction)}
      />
      <Styled.Duration variant="body2" color="text.secondary">
        <ScheduleIcon fontSize="inherit" />
        {formatCallDuration(call.durationSeconds)}
      </Styled.Duration>
    </Styled.RowSide>
  </Styled.Row>
);
