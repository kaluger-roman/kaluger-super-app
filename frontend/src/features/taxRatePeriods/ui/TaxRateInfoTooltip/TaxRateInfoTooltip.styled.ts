import { Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  cursor: pointer;
`;

export const TooltipList = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
`;
