import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const RowsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 400px;
`;

export const EmptyMessage = styled(Typography)`
  text-align: center;
  padding: 16px 0;
`;

export const ErrorMessage = styled(Typography)`
  color: ${({ theme }) => theme.palette.error.main};
  margin-top: 8px;
`;
