import type { FC } from "react";

import type { CardProps as MuiCardProps } from "@mui/material";
import { Card as MuiCard } from "@mui/material";

export type CardProps = MuiCardProps;

export const Card: FC<CardProps> = ({ children, ...props }) => {
  return <MuiCard {...props}>{children}</MuiCard>;
};
