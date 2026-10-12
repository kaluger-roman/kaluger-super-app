import type { FC } from "react";

import { Typography } from "@mui/material";

import * as Styled from "./IncomeHistoryEmpty.styled";

export const IncomeHistoryEmpty: FC = () => (
  <Styled.Container>
    <Styled.Icon aria-hidden />
    <Typography variant="subtitle1">За выбранный период поступлений нет</Typography>
    <Typography variant="body2" color="textSecondary">
      Здесь появятся оплаченные уроки с датой оплаты в этом периоде. Выберите другой период и
      нажмите «Обновить»
    </Typography>
  </Styled.Container>
);
