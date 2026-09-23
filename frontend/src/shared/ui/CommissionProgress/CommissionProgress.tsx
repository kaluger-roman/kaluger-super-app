import type { FC } from "react";

import { Handshake as HandshakeIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";

import {
  formatCommissionMoney,
  getCommissionPercent,
  getCommissionRemaining,
  isCommissionClosed,
} from "./CommissionProgress.helpers";
import * as Styled from "./CommissionProgress.styled";

type CommissionProgressProps = {
  amount?: number | null;
  repaid?: number | null;
  variant?: "full" | "compact";
};

export const CommissionProgress: FC<CommissionProgressProps> = ({
  amount,
  repaid,
  variant = "full",
}) => {
  if (!amount || amount <= 0) return null;

  // The server omits the derived fields when it could not compute them, and
  // "погашено 0 ₽" would be a lie rather than a blank — so show nothing.
  if (repaid === undefined || repaid === null) return null;

  // A closed commission is settled history, so it drops the accented block
  // and stays a quiet single line (FR-022).
  if (isCommissionClosed(amount, repaid)) {
    return (
      <Styled.ClosedLine variant="body2" color="text.secondary">
        Комиссия {formatCommissionMoney(amount)} — выплачена
      </Styled.ClosedLine>
    );
  }

  const repaidAmount = repaid ?? 0;
  const remaining = getCommissionRemaining(amount, repaidAmount);
  const percent = getCommissionPercent(amount, repaidAmount);

  if (variant === "compact") {
    return (
      <Styled.Container $isCompact>
        <Styled.CompactSummary variant="body2">
          <HandshakeIcon aria-hidden />
          Комиссия {formatCommissionMoney(amount)} · погашено {formatCommissionMoney(repaidAmount)}{" "}
          · осталось {formatCommissionMoney(remaining)}
        </Styled.CompactSummary>
        <Styled.Bar
          $isCompact
          variant="determinate"
          value={percent}
          aria-label="Прогресс погашения комиссии"
        />
      </Styled.Container>
    );
  }

  return (
    <Styled.Container $isCompact={false}>
      <Styled.Title variant="subtitle2">
        <HandshakeIcon aria-hidden />
        Погашение комиссии
      </Styled.Title>

      <Styled.Bar
        $isCompact={false}
        variant="determinate"
        value={percent}
        aria-label="Прогресс погашения комиссии"
      />

      <Styled.Row>
        <Typography variant="body2" color="text.secondary">
          Комиссия
        </Typography>
        <Styled.RowValue variant="body2">{formatCommissionMoney(amount)}</Styled.RowValue>
      </Styled.Row>
      <Styled.Row>
        <Typography variant="body2" color="text.secondary">
          Погашено
        </Typography>
        <Styled.RowValue variant="body2">{formatCommissionMoney(repaidAmount)}</Styled.RowValue>
      </Styled.Row>
      <Styled.Row>
        <Typography variant="body2" color="text.secondary">
          Осталось
        </Typography>
        <Styled.RowValue variant="body2">{formatCommissionMoney(remaining)}</Styled.RowValue>
      </Styled.Row>
    </Styled.Container>
  );
};
