import { Box } from "@mui/material";

import { styled } from "@shared";

export const CodeInputContainer = styled(Box)`
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  justify-content: center;
  margin: ${({ theme }) => theme.spacing(1, 0)};
`;

export const CodeInput = styled("input")<{ $hasError?: boolean }>`
  width: 48px;
  height: 56px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  border: 2px solid
    ${({ theme, $hasError }) => ($hasError ? theme.palette.error.main : theme.palette.divider)};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.palette.error.main : theme.palette.primary.main};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.palette.action.disabledBackground};
    cursor: not-allowed;
  }
`;
