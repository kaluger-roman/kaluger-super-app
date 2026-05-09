import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const List = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
`;

export const Row = styled(Typography)<{ $isFuture?: boolean }>`
  color: ${({ theme, $isFuture }) =>
    $isFuture ? theme.palette.text.secondary : theme.palette.text.primary};
  font-size: 0.95rem;
`;

export const CurrentBadge = styled("span")`
  color: ${({ theme }) => theme.palette.primary.main};
  font-weight: 500;
  margin-left: 6px;
`;

export const FutureBadge = styled("span")`
  color: ${({ theme }) => theme.palette.text.secondary};
  font-style: italic;
  margin-left: 6px;
`;
