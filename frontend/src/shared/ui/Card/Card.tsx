import type { FC } from "react";

import { Card as MuiCard, CardProps as MuiCardProps } from "@mui/material";

export type CardProps = MuiCardProps;

export const Card: FC<CardProps> = ({ children, ...props }) => {
  return <MuiCard {...props}>{children}</MuiCard>;
};
