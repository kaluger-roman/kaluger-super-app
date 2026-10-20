import type { FC } from "react";

import { Videocam as VideocamIcon } from "@mui/icons-material";

import { Button } from "@shared";

import type { CallButtonColor, CallButtonVariant } from "./CallButton.types";

type CallButtonProps = {
  label?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  variant?: CallButtonVariant;
  color?: CallButtonColor;
  onClick: () => void;
};

export const CallButton: FC<CallButtonProps> = ({
  label = "Видеозвонок",
  fullWidth,
  disabled,
  variant = "contained",
  color = "primary",
  onClick,
}) => (
  <Button
    variant={variant}
    color={color}
    startIcon={<VideocamIcon />}
    fullWidth={fullWidth}
    disabled={disabled}
    onClick={onClick}
  >
    {label}
  </Button>
);
