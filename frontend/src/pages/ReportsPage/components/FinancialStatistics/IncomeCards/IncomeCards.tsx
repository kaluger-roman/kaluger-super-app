import type { FC } from "react";

import { AttachMoney, KeyboardArrowDown, Payments } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useUnit } from "effector-react";

import { formatCurrency } from "@shared";
import type { Statistics } from "@shared";

import * as Styled from "./IncomeCards.styled";
import { reportsTabsModel } from "../../../model";
import { formatPaymentsCount } from "../../IncomeHistory";
import { scrollToReportsTabs } from "../../ReportsTabs";

type IncomeCardsProps = {
  statistics: Statistics;
};

export const IncomeCards: FC<IncomeCardsProps> = ({ statistics }) => {
  const actions = useUnit({ tabChanged: reportsTabsModel.tabChanged });

  return (
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
            <Styled.TealAmount variant="h4" data-testid="payments-in-range">
              {formatCurrency(statistics.paymentsInRangeSum || 0, { withKopecks: true })}
            </Styled.TealAmount>
            <Typography variant="body2" color="textSecondary">
              Фактические поступления ({formatPaymentsCount(statistics.paymentsInRangeCount || 0)}{" "}
              по дате платежа)
            </Typography>
            <Styled.HistoryLink
              type="button"
              onClick={() => {
                actions.tabChanged("history");
                scrollToReportsTabs();
              }}
            >
              История поступлений по дням
              <KeyboardArrowDown fontSize="small" />
            </Styled.HistoryLink>
          </Styled.TealCardContent>
        </Styled.TealCard>
      </Styled.StatBox>
    </>
  );
};
