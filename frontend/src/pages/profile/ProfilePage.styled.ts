import { Container, Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledContainer = styled(Container)({
  paddingTop: "32px",
  paddingBottom: "32px",
});

export const HeaderBox = styled(Box)({
  marginBottom: "24px",
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
});
