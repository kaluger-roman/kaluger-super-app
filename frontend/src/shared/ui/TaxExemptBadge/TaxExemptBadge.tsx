import type { FC } from "react";

import { ClickAwayListener, Tooltip } from "@mui/material";

import {
  TAX_EXEMPT_ARIA_LABEL,
  TAX_EXEMPT_DESCRIPTION,
  TAX_EXEMPT_LABEL,
  TAX_EXEMPT_MARK,
  TAX_EXEMPT_SHORT_LABEL,
} from "./TaxExemptBadge.constants";
import * as Styled from "./TaxExemptBadge.styled";
import { useTooltipTrigger } from "../../lib";

type TaxExemptBadgeProps = {
  isTaxExempt: boolean;
  variant?: "full" | "icon";
};

export const TaxExemptBadge: FC<TaxExemptBadgeProps> = ({ isTaxExempt, variant = "full" }) => {
  const { isOpen, open, close, handleClick, handlePointerEnter, handlePointerLeave } =
    useTooltipTrigger();

  if (!isTaxExempt) return null;

  return (
    <ClickAwayListener onClickAway={close}>
      <Tooltip
        arrow
        open={isOpen}
        onClose={close}
        disableHoverListener
        disableFocusListener
        disableTouchListener
        describeChild
        title={
          <Styled.TooltipContent>
            <Styled.TooltipTitle>{TAX_EXEMPT_LABEL}</Styled.TooltipTitle>
            <span>{TAX_EXEMPT_DESCRIPTION}</span>
          </Styled.TooltipContent>
        }
      >
        <Styled.Badge
          $isIconOnly={variant === "icon"}
          role="img"
          tabIndex={0}
          aria-label={TAX_EXEMPT_ARIA_LABEL}
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocus={open}
          onBlur={close}
        >
          <Styled.Mark>{TAX_EXEMPT_MARK}</Styled.Mark>
          {variant === "full" && <span>{TAX_EXEMPT_SHORT_LABEL}</span>}
        </Styled.Badge>
      </Tooltip>
    </ClickAwayListener>
  );
};
