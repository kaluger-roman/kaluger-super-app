import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: "32px",
  borderRadius: "16px",
  border: `1px solid ${theme.palette.divider}`,
}));

export const InfoSection = styled(Box)({
  marginBottom: "24px",
  "&:last-child": {
    marginBottom: 0,
  },
});

export const InfoLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: "8px",
  fontWeight: 500,
}));

export const ToggleRow = styled(Box)`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const Description = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: "8px",
  fontSize: "0.875rem",
}));

export const ButtonRow = styled(Box)`
  margin-top: 12px;
`;
