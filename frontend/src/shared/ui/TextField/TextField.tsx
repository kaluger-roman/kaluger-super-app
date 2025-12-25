import type { FC } from "react";

import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from "@mui/material";

export type TextFieldProps = MuiTextFieldProps;

export const TextField: FC<TextFieldProps> = ({ ...props }) => {
  return <MuiTextField {...props} />;
};
