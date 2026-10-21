import type { FC } from "react";

import { ErrorOutline as ErrorOutlineIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useUnit } from "effector-react";

import { callHistoryModel } from "@entities";
import { Button } from "@shared";

import * as Styled from "./CallHistoryList.styled";

export const CallHistoryError: FC = () => {
  const retrying = useUnit(callHistoryModel.$isLoading);
  const actions = useUnit({ retry: callHistoryModel.retryRequested });

  return (
    <Styled.EmptyBox role="alert">
      <ErrorOutlineIcon fontSize="large" color="error" />
      <Typography variant="h6">Не удалось загрузить историю звонков</Typography>
      <Button variant="outlined" onClick={() => actions.retry()} disabled={retrying}>
        Повторить
      </Button>
    </Styled.EmptyBox>
  );
};
