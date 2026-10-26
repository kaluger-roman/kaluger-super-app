import { Box, Dialog, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: 20,
    margin: theme.spacing(2),
    width: `calc(100% - ${theme.spacing(4)})`,
  },
}));

export const Content = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(4, 3, 1),
  textAlign: "center",
}));

export const Title = styled(Typography)({
  fontWeight: 600,
  overflowWrap: "anywhere",
});

export const PeerName = styled(Typography)({
  fontWeight: 500,
  overflowWrap: "anywhere",
});

export const LessonBox = styled(Box)(({ theme }) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  padding: theme.spacing(1.5, 2),
  borderRadius: 12,
  background: theme.palette.grey[100],
}));

export const LessonCaption = styled(Typography)({
  letterSpacing: "0.06em",
});

type ActionsProps = {
  $isMobile: boolean;
};

export const Actions = styled(Box)<ActionsProps>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column-reverse" : "row",
  justifyContent: "flex-end",
  gap: theme.spacing(1),
  padding: theme.spacing(2, 3, 3),
  "& .MuiButton-root": {
    minHeight: $isMobile ? 48 : 40,
  },
}));
