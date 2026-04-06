import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: "16px",
  border: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(3),
}));

export const SectionTitle = styled(Typography)({
  fontWeight: 700,
  marginBottom: "24px",
});

export const FieldsBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const ButtonBox = styled(Box)({
  marginTop: "24px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "16px",
});

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

export const InfoText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textAlign: "center",
  marginBottom: theme.spacing(2),
}));
