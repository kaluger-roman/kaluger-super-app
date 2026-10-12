import type { FC } from "react";

import { formatCurrency } from "@shared";
import type { IncomeHistorySummary as IncomeHistorySummaryData } from "@shared";

import * as Styled from "./IncomeHistorySummary.styled";
import { formatPaymentsCount } from "../../IncomeHistory.helpers";

type IncomeHistorySummaryProps = {
  summary: IncomeHistorySummaryData;
};

export const IncomeHistorySummary: FC<IncomeHistorySummaryProps> = ({ summary }) => (
  <Styled.Tiles role="group" aria-label="Итог за период">
    <Styled.Tile $tone="income">
      <Styled.Label variant="caption">Поступило за период</Styled.Label>
      <Styled.Value variant="h6" data-testid="income-history-total">
        {formatCurrency(summary.total, { withKopecks: true })}
      </Styled.Value>
      <Styled.Hint variant="caption">{formatPaymentsCount(summary.count)}</Styled.Hint>
    </Styled.Tile>

    {summary.taxTotal !== null && (
      <Styled.Tile $tone="tax">
        <Styled.Label variant="caption">Налог</Styled.Label>
        <Styled.Value variant="h6">{formatCurrency(summary.taxTotal)}</Styled.Value>
        <Styled.Hint variant="caption">по ставке на дату оплаты</Styled.Hint>
      </Styled.Tile>
    )}

    {summary.taxExemptTotal !== null && summary.taxExemptTotal > 0 && (
      <Styled.Tile $tone="exempt">
        <Styled.Label variant="caption">Не облагается налогом</Styled.Label>
        <Styled.Value variant="h6">
          {formatCurrency(summary.taxExemptTotal, { withKopecks: true })}
        </Styled.Value>
        <Styled.Hint variant="caption">не входит в налог</Styled.Hint>
      </Styled.Tile>
    )}

    {summary.commissionTotal !== null && (
      <Styled.Tile $tone="commission">
        <Styled.Label variant="caption">В счёт комиссий</Styled.Label>
        <Styled.Value variant="h6">
          {formatCurrency(summary.commissionTotal, { withKopecks: true })}
        </Styled.Value>
        <Styled.Hint variant="caption">из полученных сумм</Styled.Hint>
      </Styled.Tile>
    )}
  </Styled.Tiles>
);
