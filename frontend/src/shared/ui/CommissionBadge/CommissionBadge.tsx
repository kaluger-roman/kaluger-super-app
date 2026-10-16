import type { FC } from "react";

import {
  Handshake as HandshakeIcon,
  HandshakeOutlined as HandshakeOutlinedIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";

import { COMMISSION_BADGE_LABELS } from "./CommissionBadge.constants";
import {
  formatCommissionAriaLabel,
  formatCommissionFullText,
  formatCommissionInlineText,
} from "./CommissionBadge.helpers";
import * as Styled from "./CommissionBadge.styled";
import type { CommissionCredit } from "../../types";

type CommissionBadgeProps = {
  credit?: CommissionCredit | null;
  variant?: "inline" | "full";
};

export const CommissionBadge: FC<CommissionBadgeProps> = ({ credit, variant = "inline" }) => {
  if (!credit || credit.amount <= 0) return null;

  const isForecast = credit.state === "FORECAST";

  return (
    <Tooltip title={COMMISSION_BADGE_LABELS[credit.state]}>
      <Styled.Badge
        $isForecast={isForecast}
        role="img"
        aria-label={formatCommissionAriaLabel(credit)}
      >
        <Styled.Icon aria-hidden>
          {isForecast ? <HandshakeOutlinedIcon /> : <HandshakeIcon />}
        </Styled.Icon>
        <Styled.BadgeText>
          {variant === "full"
            ? formatCommissionFullText(credit)
            : formatCommissionInlineText(credit)}
        </Styled.BadgeText>
      </Styled.Badge>
    </Tooltip>
  );
};
