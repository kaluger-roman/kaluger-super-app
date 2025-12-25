import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  textAlign: "center",
  marginBottom: $isMobile ? theme.spacing(2) : theme.spacing(3),
}));

export const EmojiTitle = styled(Typography)<{ $isMobile: boolean; component?: React.ElementType }>(
  ({ theme }) => ({
    fontWeight: 700,
    color: theme.palette.primary.main,
  })
);

export const Title = styled(Typography)<{ $isMobile: boolean; component?: React.ElementType }>(
  () => ({
    fontWeight: 600,
  })
);

export const Subtitle = styled(Typography)<{ $isMobile: boolean }>();
