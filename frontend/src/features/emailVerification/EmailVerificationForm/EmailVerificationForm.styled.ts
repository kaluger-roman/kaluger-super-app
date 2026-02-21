import { Box, Paper } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing(2)};
`;

export const StyledPaper = styled(Paper)<{ $isMobile: boolean }>`
  padding: ${({ theme, $isMobile }) => theme.spacing($isMobile ? 3 : 4)};
  width: 100%;
  max-width: ${({ $isMobile }) => ($isMobile ? "100%" : "440px")};
  text-align: center;
`;

export const CodeInputContainer = styled(Box)`
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  justify-content: center;
  margin: ${({ theme }) => theme.spacing(3, 0)};
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

export const IconBox = styled(Box)`
  font-size: 64px;
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

export const ActionsBox = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: ${({ theme }) => theme.spacing(3)};
`;
