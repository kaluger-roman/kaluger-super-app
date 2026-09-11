import type { FC } from "react";

import { Typography, CardContent } from "@mui/material";

import { TaxRateInfoTooltip } from "@features";
import { formatCurrency } from "@shared";
import type { Statistics } from "@shared";

import { DebtCard } from "./DebtCard";
import { getTaxLabel, shouldShowTaxInfoIcon } from "./FinancialStatistics.helpers";
import * as Styled from "./FinancialStatistics.styled";
import { IncomeCards } from "./IncomeCards";
import { calculateAveragePrice } from "../../ReportsPage.helpers";

type FinancialStatisticsProps = {
  statistics: Statistics;
};

export const FinancialStatistics: FC<FinancialStatisticsProps> = ({ statistics }) => {
  const showTaxCard =
    statistics.taxAmount !== null && statistics.taxBreakdown !== null;
  const breakdown = statistics.taxBreakdown ?? [];
  const taxLabel = getTaxLabel(breakdown);
  const showInfoIcon = shouldShowTaxInfoIcon(breakdown);
  return (
    <Styled.StatsContainer>
      <IncomeCards statistics={statistics} />

      <Styled.StatBox flex="1" minWidth={220}>
        <Styled.YellowCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Средний урок
            </Typography>
            <Styled.YellowAmount variant="h4">
              {formatCurrency(
                calculateAveragePrice(statistics.earnings, statistics.completedLessons)
              )}
            </Styled.YellowAmount>
            <Typography variant="body2" color="textSecondary">
              Средняя цена по завершенным урокам
            </Typography>
          </CardContent>
        </Styled.YellowCard>
      </Styled.StatBox>

      <Styled.StatBox flex="1" minWidth={220}>
        <Styled.RedCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Потери от отмен
            </Typography>
            <Styled.RedAmount variant="h4" color="error">
              -{formatCurrency(statistics.lostEarnings)}
            </Styled.RedAmount>
            <Typography variant="body2" color="textSecondary">
              Сумма потерянного дохода из-за отмен
            </Typography>
          </CardContent>
        </Styled.RedCard>
      </Styled.StatBox>

      {/* Tax amount — скрыта целиком когда taxEnabled=false */}
      {showTaxCard ? (
        <Styled.StatBox flex="1" minWidth={220}>
          <Styled.OrangeCard>
            <CardContent>
              <Styled.TaxTitle variant="h6" gutterBottom>
                {taxLabel}
                {showInfoIcon ? (
                  <TaxRateInfoTooltip breakdown={breakdown} />
                ) : null}
              </Styled.TaxTitle>
              <Styled.OrangeAmount variant="h4">
                {formatCurrency(statistics.taxAmount ?? 0)}
              </Styled.OrangeAmount>
              <Typography variant="body2" color="textSecondary">
                Сумма налога по оплатам за период
              </Typography>
            </CardContent>
          </Styled.OrangeCard>
        </Styled.StatBox>
      ) : null}

      <Styled.StatBox flex="1" minWidth={220}>
        <Styled.LightGreenCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Потенциальный доход за период
            </Typography>
            <Styled.LightGreenAmount variant="h4">
              {formatCurrency(
                statistics.earnings +
                  (statistics.unpaidDebtSum || 0) +
                  (statistics.upcomingIncome || 0)
              )}
            </Styled.LightGreenAmount>
            <Typography variant="body2" color="textSecondary">
              Уже заработанное + долг + все предстоящие уроки без отмен
            </Typography>
          </CardContent>
        </Styled.LightGreenCard>
      </Styled.StatBox>

      <Styled.StatBox>
        <DebtCard statistics={statistics} />
      </Styled.StatBox>

      <Styled.StatBox flex="0" minWidth={180}>
        <Styled.PurpleCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Пробные уроки
            </Typography>
            <Styled.PurpleAmount variant="h4">
              {statistics.trialLessonsCount || 0}
            </Styled.PurpleAmount>
            <Typography variant="body2" color="textSecondary">
              Бесплатных уроков в периоде
            </Typography>
          </CardContent>
        </Styled.PurpleCard>
      </Styled.StatBox>
    </Styled.StatsContainer>
  );
};
