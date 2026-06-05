import type { FC } from "react";

import type { ButtonProps as MuiButtonProps } from "@mui/material";
import { Button as MuiButton } from "@mui/material";

export type ButtonProps = MuiButtonProps;

export const Button: FC<ButtonProps> = ({ children, ...props }) => {
  return <MuiButton {...props}>{children}</MuiButton>;
};
