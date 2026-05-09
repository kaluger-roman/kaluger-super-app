import { Box } from "@mui/material";

import { styled } from "@shared";

export const Row = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
`;

export const DateField = styled(Box)`
  flex: 1;
  min-width: 160px;
`;

export const RateField = styled(Box)`
  width: 120px;
`;
