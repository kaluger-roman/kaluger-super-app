import type { FC } from "react";

import { AttachMoney, Payments } from "@mui/icons-material";
import { Typography } from "@mui/material";

import { formatCurrency } from "@shared";
import type { Statistics } from "@shared";

import * as Styled from "./IncomeCards.styled";

type IncomeCardsProps = {
  statistics: Statistics;
};

export const IncomeCards: FC<IncomeCardsProps> = ({ statistics }) => (
  <>
    <Styled.StatBox>
      <Styled.GreenCard>
        <Styled.GreenCardContent>
          <Styled.GreenTitle variant="h6">
            <AttachMoney className="icon" />
            Заработок
          </Styled.GreenTitle>
          <Styled.GreenAmount variant="h4" data-testid="earnings">
            {formatCurrency(statistics.earnings)}
          </Styled.GreenAmount>
          <Typography variant="body2" color="textSecondary">
            Сумма за проведённые уроки в периоде (по дате урока)
          </Typography>
        </Styled.GreenCardContent>
      </Styled.GreenCard>
    </Styled.StatBox>

    <Styled.StatBox>
      <Styled.TealCard>
        <Styled.TealCardContent>
          <Styled.TealTitle variant="h6">
            <Payments className="icon" />
            Поступления за период
          </Styled.TealTitle>
          <Styled.TealAmount variant="h4">
            {formatCurrency(statistics.paymentsInRangeSum || 0)}
          </Styled.TealAmount>
          <Typography variant="body2" color="textSecondary">
            Фактические поступления ({statistics.paymentsInRangeCount || 0} оплат по дате платежа)
          </Typography>
        </Styled.TealCardContent>
      </Styled.TealCard>
    </Styled.StatBox>
  </>
);
