import type { FC, ReactNode } from "react";

import { Typography, CardContent } from "@mui/material";

import * as Styled from "./StatCard.styled";

type StatCardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  subtitle?: string;
};

export const StatCard: FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Styled.Container>
    <CardContent>
      <Styled.HeaderBox>
        <Styled.IconBox $color={color}>{icon}</Styled.IconBox>
        <Typography variant="h6" color="textSecondary">
          {title}
        </Typography>
      </Styled.HeaderBox>
      <Styled.ValueText variant="h4" $color={color}>
        {value}
      </Styled.ValueText>
      {subtitle && (
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Styled.Container>
);
