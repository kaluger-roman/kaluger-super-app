import type { FC } from "react";

import { AttachMoney, HandshakeOutlined } from "@mui/icons-material";
import { Typography } from "@mui/material";

import { formatCurrency } from "@shared";
import type { Statistics } from "@shared";

import * as Styled from "./PeriodIndependentStats.styled";

type PeriodIndependentStatsProps = {
  statistics: Statistics;
};

// Current-moment snapshots: the date filter does not affect them, so they live
// in their own captioned group instead of the per-period grid.
export const PeriodIndependentStats: FC<PeriodIndependentStatsProps> = ({ statistics }) => (
  <Styled.Section>
    <Styled.SectionDivider />
    <Styled.Group>
      <Styled.Caption variant="overline">Не зависит от выбранного периода</Styled.Caption>
      <Styled.Row>
        <Styled.StatBox>
          <Styled.PrepaidCard>
            <Styled.PrepaidCardContent>
              <Styled.PrepaidTitle variant="h6">
                <AttachMoney className="icon" />
                Предоплата
              </Styled.PrepaidTitle>
              <Styled.PrepaidAmount variant="h4" data-testid="prepaid-income">
                {formatCurrency(statistics.prepaidIncome || 0)}
              </Styled.PrepaidAmount>
              <Typography variant="body2" color="textSecondary">
                Доход от предоплаченных уроков (остаток)
              </Typography>
            </Styled.PrepaidCardContent>
          </Styled.PrepaidCard>
        </Styled.StatBox>

        {statistics.hasCommissionStudents ? (
          <Styled.StatBox>
            <Styled.SnapshotCard>
              <Styled.SnapshotCardContent>
                <Styled.SnapshotTitle variant="h6">
                  <HandshakeOutlined className="icon" />
                  Осталось погасить комиссий
                </Styled.SnapshotTitle>
                <Styled.SnapshotAmount variant="h4" data-testid="commission-remaining-total">
                  {formatCurrency(statistics.commissionRemainingTotal || 0, { withKopecks: true })}
                </Styled.SnapshotAmount>
                <Typography variant="body2" color="textSecondary">
                  Суммарный остаток по активным ученикам на текущий момент
                </Typography>
              </Styled.SnapshotCardContent>
            </Styled.SnapshotCard>
          </Styled.StatBox>
        ) : null}
      </Styled.Row>
    </Styled.Group>
  </Styled.Section>
);
