import { Container, Box, Typography, styled } from "@mui/material";

export const StyledContainer = styled(Container)({
  paddingTop: "24px",
  paddingBottom: "24px",
});

export const HeaderBox = styled(Box)({
  marginBottom: "24px",
});

export const StyledTitle = styled(Typography)({
  fontWeight: 600,
}) as typeof Typography;
