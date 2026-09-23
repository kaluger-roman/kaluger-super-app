import type { FC } from "react";

import { Handshake } from "@mui/icons-material";
import { Typography } from "@mui/material";

import { formatCurrency } from "@shared";
import type { Statistics } from "@shared";

import * as Styled from "./CommissionCards.styled";

type CommissionCardsProps = {
  statistics: Statistics;
};

export const CommissionCards: FC<CommissionCardsProps> = ({ statistics }) => {
  if (!statistics.hasCommissionStudents) return null;

  return (
    <Styled.StatBox>
      <Styled.CommissionCard>
        <Styled.CommissionCardContent>
          <Styled.CommissionTitle variant="h6">
            <Handshake className="icon" />
            Списано в счёт комиссий
          </Styled.CommissionTitle>
          <Styled.CommissionAmount variant="h4" data-testid="commission-written-off">
            {formatCurrency(statistics.commissionWrittenOffSum || 0, { withKopecks: true })}
          </Styled.CommissionAmount>
          <Typography variant="body2" color="textSecondary">
            За период, по дате оплаты
          </Typography>
        </Styled.CommissionCardContent>
      </Styled.CommissionCard>
    </Styled.StatBox>
  );
};
