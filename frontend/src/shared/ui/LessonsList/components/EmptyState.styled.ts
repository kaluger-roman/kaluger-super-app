import { Box, Typography } from "@mui/material";

import { styled } from "../../../lib/styled.helpers";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  paddingTop: theme.spacing(8),
  paddingBottom: theme.spacing(8),
  textAlign: "center",
}));

export const Title = styled(Typography)();

export const Description = styled(Typography)();
