import type { FC } from "react";

import { PriceChangeOutlined } from "@mui/icons-material";
import { ClickAwayListener, Tooltip } from "@mui/material";

import {
  RECEIVED_MISMATCH_FIX_HINT,
  RECEIVED_MISMATCH_REASON,
} from "./ReceivedAmountHint.constants";
import {
  formatReceivedMismatchTitle,
  formatReceivedShortLabel,
  isReceivedAmountMismatch,
  stopActivationKeyPropagation,
} from "./ReceivedAmountHint.helpers";
import * as Styled from "./ReceivedAmountHint.styled";
import { useTooltipTrigger } from "../../lib";

type ReceivedAmountHintProps = {
  receivedAmount?: number | null;
  price?: number | null;
  variant?: "icon" | "full";
};

export const ReceivedAmountHint: FC<ReceivedAmountHintProps> = ({
  receivedAmount,
  price,
  variant = "icon",
}) => {
  const { isOpen, open, close, handleClick, handlePointerEnter, handlePointerLeave } =
    useTooltipTrigger();

  if (typeof receivedAmount !== "number" || !isReceivedAmountMismatch(receivedAmount, price)) {
    return null;
  }

  const title = formatReceivedMismatchTitle(receivedAmount, price ?? 0);

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
            <Styled.TooltipTitle>{title}</Styled.TooltipTitle>
            <span>{RECEIVED_MISMATCH_REASON}</span>
            <span>{RECEIVED_MISMATCH_FIX_HINT}</span>
          </Styled.TooltipContent>
        }
      >
        <Styled.Trigger
          $isIconOnly={variant === "icon"}
          role="img"
          tabIndex={0}
          aria-label={title}
          onClick={handleClick}
          onKeyDown={stopActivationKeyPropagation}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocus={open}
          onBlur={close}
        >
          <PriceChangeOutlined aria-hidden />
          {variant === "full" && <span>{formatReceivedShortLabel(receivedAmount)}</span>}
        </Styled.Trigger>
      </Tooltip>
    </ClickAwayListener>
  );
};
