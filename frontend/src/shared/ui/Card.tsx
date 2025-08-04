import React from "react";
import { Card as MuiCard, CardProps as MuiCardProps } from "@mui/material";

export type CardProps = MuiCardProps;

export const Card: React.FC<CardProps> = ({ children, ...props }) => {
  return <MuiCard {...props}>{children}</MuiCard>;
};
