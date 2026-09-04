import { useState } from "react";
import type { FC, ReactNode } from "react";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { ClickAwayListener, Tooltip } from "@mui/material";
import type { TooltipProps } from "@mui/material";

import * as Styled from "./InfoTooltip.styled";

type InfoTooltipProps = {
  title: ReactNode;
  ariaLabel: string;
  placement?: TooltipProps["placement"];
};

export const InfoTooltip: FC<InfoTooltipProps> = ({
  title,
  ariaLabel,
  placement = "top",
}) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);
  const handleOpen = () => setOpen(true);
  const handleToggle = () => setOpen((prev) => !prev);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Tooltip
        open={open}
        title={title}
        arrow
        placement={placement}
        onClose={handleClose}
      >
        <Styled.Container
          role="button"
          aria-label={ariaLabel}
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
