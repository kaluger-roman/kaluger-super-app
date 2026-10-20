import type { FC } from "react";

import { ErrorOutline as ErrorOutlineIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";

import { Button } from "@shared";

import * as Styled from "./CallHistoryList.styled";

type CallHistoryErrorProps = {
  retrying: boolean;
  onRetry: () => void;
};

export const CallHistoryError: FC<CallHistoryErrorProps> = ({ retrying, onRetry }) => (
  <Styled.EmptyBox role="alert">
    <ErrorOutlineIcon fontSize="large" color="error" />
    <Typography variant="h6">Не удалось загрузить историю звонков</Typography>
    <Button variant="outlined" onClick={onRetry} disabled={retrying}>
      Повторить
    </Button>
  </Styled.EmptyBox>
);
