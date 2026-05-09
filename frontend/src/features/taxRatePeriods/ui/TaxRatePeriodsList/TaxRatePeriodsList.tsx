import { useMemo } from "react";
import type { FC } from "react";

import { useUnit } from "effector-react";

import { taxRatePeriodModel } from "@entities";
import { formatDate } from "@shared";

import { labelPeriods } from "./TaxRatePeriodsList.helpers";
import * as Styled from "./TaxRatePeriodsList.styled";

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const TaxRatePeriodsList: FC = () => {
  const periods = useUnit(taxRatePeriodModel.$periods);
  const today = todayIso();

  const labeled = useMemo(() => labelPeriods(periods, today), [periods, today]);

  if (labeled.length === 0) return null;

  return (
    <Styled.List>
      {labeled.map(({ period, isCurrent, isFuture }) => (
        <Styled.Row key={period.id} $isFuture={isFuture} variant="body2">
          {period.rate}% с {formatDate(period.startDate)}
          {isCurrent ? (
            <Styled.CurrentBadge>(текущая)</Styled.CurrentBadge>
          ) : null}
          {isFuture ? (
            <Styled.FutureBadge>(вступит в силу)</Styled.FutureBadge>
          ) : null}
        </Styled.Row>
      ))}
    </Styled.List>
  );
};
