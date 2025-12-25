import { Container, Box, Typography, Paper, Fab, styled } from "@mui/material";

export const StyledContainer = styled(Container)({
  paddingTop: "32px",
  paddingBottom: "32px",
});

export const HeaderBox = styled(Box)({
  marginBottom: "32px",
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
}) as typeof Typography;

export const StyledPaper = styled(Paper)({
  padding: "24px",
});

export const StyledFab = styled(Fab)({
  position: "fixed",
  bottom: 24,
  right: 24,
  width: 64,
  height: 64,
  "& .MuiSvgIcon-root": {
    fontSize: 28,
  },
});
