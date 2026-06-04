import { Box, Container, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

export const HeaderBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const StyledTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  fontWeight: 600,
}));

export const TitleIcon = styled("span")({
  flexShrink: 0,
  lineHeight: 1,
});

export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
}));
