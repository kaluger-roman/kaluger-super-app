import { Box, Paper } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.grey[50],
  padding: theme.spacing(3),
}));

type StyledPaperProps = {
  $isMobile: boolean;
};

export const StyledPaper = styled(Paper)<StyledPaperProps>(
  ({ theme, $isMobile }) => ({
    padding: theme.spacing($isMobile ? 3 : 4),
    width: "100%",
    maxWidth: $isMobile ? "100%" : 480,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
  })
);

export const IconBox = styled(Box)(({ theme }) => ({
  fontSize: 64,
  textAlign: "center",
  marginBottom: theme.spacing(1),
}));

export const Footer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  marginTop: theme.spacing(1),
}));
