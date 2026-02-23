import { Container, Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledContainer = styled(Container)({
  paddingTop: 32,
  paddingBottom: 32,
});

export const HeaderBox = styled(Box)({
  marginBottom: 32,
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
}) as typeof Typography;
