import type { FC } from "react";

import { useUnit } from "effector-react";

import { lessonModel } from "@entities";
import { lessonsModel } from "@features";
import { formatCurrency } from "@shared";

import * as Styled from "./PaymentsSummaryBar.styled";

export const PaymentsSummaryBar: FC = () => {
  const paymentsSummary = useUnit(lessonModel.$paymentsSummary);
  const paymentDateFrom = useUnit(lessonsModel.$paymentDateFrom);
  const paymentDateTo = useUnit(lessonsModel.$paymentDateTo);

  const isFilterActive = paymentDateFrom !== null || paymentDateTo !== null;

  if (!isFilterActive || !paymentsSummary) {
    return null;
  }

  return (
    <Styled.Container elevation={0}>
      <Styled.Icon />
      <Styled.Label variant="body1">Оплачено за период:</Styled.Label>
      <Styled.Amount variant="h6">{formatCurrency(paymentsSummary.sum)}</Styled.Amount>
      <Styled.Separator />
      <Styled.Label variant="body2">{paymentsSummary.count} уроков</Styled.Label>
    </Styled.Container>
  );
};
