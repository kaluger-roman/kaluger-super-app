import type { FC } from "react";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Tooltip, Typography, ClickAwayListener } from "@mui/material";

import { useTooltipTrigger } from "@shared";
import type { TaxBreakdownEntry } from "@shared";

import { formatBreakdownLine, formatTaxExemptLine } from "./TaxRateInfoTooltip.helpers";
import * as Styled from "./TaxRateInfoTooltip.styled";

type Props = {
  breakdown: TaxBreakdownEntry[];
  taxExemptIncome?: number;
};

export const TaxRateInfoTooltip: FC<Props> = ({ breakdown, taxExemptIncome = 0 }) => {
  const { isOpen, open, close, handleClick, handlePointerEnter, handlePointerLeave } =
    useTooltipTrigger();

  const tooltipContent = (
    <Styled.TooltipList>
      {breakdown.map((entry) => (
        <Typography key={`${entry.rate}-${entry.isOutsidePeriods ? "out" : "in"}`} variant="body2">
          {formatBreakdownLine(entry)}
        </Typography>
      ))}
      {taxExemptIncome > 0 ? (
        <Styled.ExemptLine variant="body2">
          {formatTaxExemptLine(taxExemptIncome)}
        </Styled.ExemptLine>
      ) : null}
    </Styled.TooltipList>
  );

  return (
    <ClickAwayListener onClickAway={close}>
      <Tooltip
        open={isOpen}
        title={tooltipContent}
        arrow
        placement="top"
        onClose={close}
        disableHoverListener
        disableFocusListener
        disableTouchListener
        describeChild
      >
        <Styled.Container
          role="button"
          aria-label="Подробности расчёта налога"
          tabIndex={0}
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocus={open}
          onBlur={close}
        >
          <InfoOutlinedIcon fontSize="small" color="action" />
        </Styled.Container>
      </Tooltip>
    </ClickAwayListener>
  );
};
