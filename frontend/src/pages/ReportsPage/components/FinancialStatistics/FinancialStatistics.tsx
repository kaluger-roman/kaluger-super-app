import type { FC } from "react";

import { AttachMoney, Payments } from "@mui/icons-material";
import { Typography, CardContent, Box } from "@mui/material";

import { TaxRateInfoTooltip } from "@features";
import { formatCurrency } from "@shared";
import type { Statistics } from "@shared";

import { getTaxLabel, shouldShowTaxInfoIcon } from "./FinancialStatistics.helpers";
import * as Styled from "./FinancialStatistics.styled";
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
      <Styled.StatBox>
        <Styled.GreenCard>
          <Styled.GreenCardContent>
            <Styled.GreenTitle variant="h6">
              <AttachMoney className="icon" />
              Заработок
            </Styled.GreenTitle>
            <Styled.GreenAmount variant="h4">
              {formatCurrency(statistics.earnings)}
            </Styled.GreenAmount>
            <Typography variant="body2" color="textSecondary">
              Сумма за проведённые уроки в периоде (по дате урока)
            </Typography>
          </Styled.GreenCardContent>
        </Styled.GreenCard>
      </Styled.StatBox>

      <Styled.StatBox>
        <Styled.BlueCard>
          <Styled.BlueCardContent>
            <Styled.BlueTitle variant="h6">
              <AttachMoney className="icon" />
              Предоплата
            </Styled.BlueTitle>
            <Styled.BlueAmount variant="h4">
              {formatCurrency(statistics.prepaidIncome || 0)}
            </Styled.BlueAmount>
            <Typography variant="body2" color="textSecondary">
              Дохoд от всех предоплаченных уроков (остаток)
            </Typography>
          </Styled.BlueCardContent>
        </Styled.BlueCard>
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

      {/* Average lesson */}
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

      {/* Lost earnings */}
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
              <Typography variant="h6" gutterBottom>
                {taxLabel}
                {showInfoIcon ? (
                  <TaxRateInfoTooltip breakdown={breakdown} />
                ) : null}
              </Typography>
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

      {/* Potential income */}
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

      {/* Unpaid debt */}
      <Styled.StatBox>
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
