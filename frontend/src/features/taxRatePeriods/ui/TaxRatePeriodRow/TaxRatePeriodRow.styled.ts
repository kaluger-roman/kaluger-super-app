import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const RowWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  padding: 8px 0;
`;

export const InputsLine = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const DateField = styled(Box)`
  flex: 1;
  min-width: 160px;
`;

export const RateField = styled(Box)`
  width: 120px;
`;

export const Caption = styled(Typography)`
  margin-top: 4px;
  margin-left: 12px;
  min-height: 18px;
`;
