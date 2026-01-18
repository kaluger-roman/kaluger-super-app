import { Container, Box, Typography, Paper, Button } from "@mui/material";

import { styled } from "@shared";

export const StyledContainer = styled(Container)({
  paddingTop: "32px",
  paddingBottom: "32px",
});

export const HeaderBox = styled(Box)({
  marginBottom: "32px",
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
});

export const StyledPaper = styled(Paper)(({ theme }) => ({
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

export const InfoValue = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: "1.125rem",
}));

export const ButtonBox = styled(Box)({
  marginTop: "32px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "16px",
});

export const SaveButton = styled(Button)({
  minWidth: "120px",
});
