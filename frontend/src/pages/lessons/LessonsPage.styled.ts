import { Container, Box, Typography, styled } from "@mui/material";

export const StyledContainer = styled(Container)({
  paddingTop: "32px",
  paddingBottom: "32px",
});

export const HeaderBox = styled(Box)({
  marginBottom: "8px",
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
}) as typeof Typography;

export const ControlsBox = styled(Box)({
  marginTop: "16px",
});
