import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)`
  display: inline-flex;
  align-items: center;
  cursor: pointer;
`;

export const TooltipList = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
`;

export const ExemptLine = styled(Typography)`
  &:not(:first-of-type) {
    margin-top: 2px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
  }
`;
