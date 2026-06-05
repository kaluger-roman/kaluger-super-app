import type { FC } from "react";

import { PhoneDisabled as PhoneDisabledIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";

import * as Styled from "./CallHistoryList.styled";

export const CallHistoryEmpty: FC = () => (
  <Styled.EmptyBox>
    <PhoneDisabledIcon fontSize="large" color="disabled" />
    <Typography variant="h6">Звонков пока нет</Typography>
    <Typography variant="body2">
      Здесь появится история ваших видеозвонков
    </Typography>
  </Styled.EmptyBox>
);
