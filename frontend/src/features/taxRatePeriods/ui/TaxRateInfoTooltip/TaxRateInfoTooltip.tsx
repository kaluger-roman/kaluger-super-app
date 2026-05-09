import { useState } from "react";
import type { FC } from "react";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Tooltip, Typography, ClickAwayListener } from "@mui/material";

import type { TaxBreakdownEntry } from "@shared";

import { formatBreakdownLine } from "./TaxRateInfoTooltip.helpers";
import * as Styled from "./TaxRateInfoTooltip.styled";

type Props = {
  breakdown: TaxBreakdownEntry[];
};

export const TaxRateInfoTooltip: FC<Props> = ({ breakdown }) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);
  const handleToggle = () => setOpen((prev) => !prev);
  const handleOpen = () => setOpen(true);

  const tooltipContent = (
    <Styled.TooltipList>
      {breakdown.map((entry) => (
        <Typography
          key={`${entry.rate}-${entry.isOutsidePeriods ? "out" : "in"}`}
          variant="body2"
        >
          {formatBreakdownLine(entry)}
        </Typography>
      ))}
    </Styled.TooltipList>
  );

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Tooltip
        open={open}
        title={tooltipContent}
        arrow
        placement="top"
        onClose={handleClose}
      >
        <Styled.Container
          role="button"
          aria-label="Подробности расчёта налога"
          tabIndex={0}
          onClick={handleToggle}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onFocus={handleOpen}
          onBlur={handleClose}
        >
          <InfoOutlinedIcon fontSize="small" color="action" />
        </Styled.Container>
      </Tooltip>
    </ClickAwayListener>
  );
};
