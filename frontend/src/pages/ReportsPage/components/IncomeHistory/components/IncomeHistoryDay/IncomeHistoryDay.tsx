import { memo } from "react";
import type { FC } from "react";

import { formatCurrency } from "@shared";
import type { IncomeHistoryDay as IncomeHistoryDayData } from "@shared";

import { formatHistoryDayLabel } from "./IncomeHistoryDay.helpers";
import * as Styled from "./IncomeHistoryDay.styled";
import { formatPaymentsCount } from "../../IncomeHistory.helpers";
import { IncomeHistoryRow } from "../IncomeHistoryRow";

type IncomeHistoryDayProps = {
  day: IncomeHistoryDayData;
};

const IncomeHistoryDayView: FC<IncomeHistoryDayProps> = ({ day }) => (
  <Styled.Container aria-label={formatHistoryDayLabel(day.date)}>
    <Styled.Header>
      <Styled.HeaderMain>
        <Styled.DayLabel variant="subtitle1">{formatHistoryDayLabel(day.date)}</Styled.DayLabel>
        <Styled.Muted variant="body2">{formatPaymentsCount(day.entries.length)}</Styled.Muted>
      </Styled.HeaderMain>
      <Styled.HeaderTotals>
        <Styled.DayTotal variant="subtitle1">
          {formatCurrency(day.total, { withKopecks: true })}
        </Styled.DayTotal>
        {day.taxTotal !== null && (
          <Styled.Muted variant="body2">налог {formatCurrency(day.taxTotal)}</Styled.Muted>
        )}
      </Styled.HeaderTotals>
    </Styled.Header>
    <Styled.Rows disablePadding>
      {day.entries.map((entry) => (
        <IncomeHistoryRow key={entry.lessonId} entry={entry} />
      ))}
    </Styled.Rows>
  </Styled.Container>
);

// Pages appended by «Показать ещё» keep earlier day objects, so those days skip re-render.
export const IncomeHistoryDay = memo(IncomeHistoryDayView);
