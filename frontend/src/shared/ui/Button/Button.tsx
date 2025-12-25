import type { FC } from "react";

import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
} from "@mui/material";

export type ButtonProps = MuiButtonProps;

export const Button: FC<ButtonProps> = ({ children, ...props }) => {
  return <MuiButton {...props}>{children}</MuiButton>;
};
