import type { FC } from "react";

import type { TextFieldProps as MuiTextFieldProps } from "@mui/material";
import { TextField as MuiTextField } from "@mui/material";

export type TextFieldProps = MuiTextFieldProps;

export const TextField: FC<TextFieldProps> = ({ ...props }) => {
  return <MuiTextField {...props} />;
};
