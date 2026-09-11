import type { FC } from "react";

import { Typography, CardContent, Box } from "@mui/material";

import { formatCurrency } from "@shared";
import type { Statistics } from "@shared";

import * as Styled from "./DebtCard.styled";

type DebtCardProps = {
  statistics: Statistics;
};

export const DebtCard: FC<DebtCardProps> = ({ statistics }) => (
  <Styled.YellowDebtCard>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Задолженность
      </Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        <Styled.DebtRow>
          <Typography variant="body2">Итого (проведено, не оплачено):</Typography>
          <Styled.DebtAmount variant="body2" color="error">
            {formatCurrency(statistics.unpaidDebtSum || 0)}
          </Styled.DebtAmount>
        </Styled.DebtRow>
        <Styled.DebtRow>
          <Typography variant="body2">Количество уроков:</Typography>
          <Styled.DebtAmount variant="body2" color="error">
            {statistics.unpaidDebtCount || 0}
          </Styled.DebtAmount>
        </Styled.DebtRow>
        <Styled.DebtRow>
          <Typography variant="body2" color="textSecondary">
            Не оплачено более 24 часов:
          </Typography>
          <Styled.DebtAmount variant="body2" color="error">
            {formatCurrency(statistics.unpaidDebtOver24hSum || 0)} (
            {statistics.unpaidDebtOver24hCount || 0} уроков)
          </Styled.DebtAmount>
        </Styled.DebtRow>
      </Box>
    </CardContent>
  </Styled.YellowDebtCard>
);
