import type { FC } from "react";

import { Videocam as VideocamIcon } from "@mui/icons-material";

import { Button } from "@shared";

type CallButtonVariant = "contained" | "outlined" | "text";
type CallButtonColor = "primary" | "secondary" | "inherit";

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
