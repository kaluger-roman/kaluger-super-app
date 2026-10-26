import { Box, Dialog, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: 16,
    margin: theme.spacing(2),
    width: `calc(100% - ${theme.spacing(4)})`,
  },
}));

export const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(1),
  padding: theme.spacing(2.5, 3, 1),
}));

export const Body = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 3, 2),
}));

export const Subject = styled(Typography)({
  fontWeight: 600,
});

export const InfoRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  color: theme.palette.text.secondary,
}));

type ActionsProps = {
  $isMobile: boolean;
};

export const Actions = styled(Box)<ActionsProps>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column-reverse" : "row",
  justifyContent: "flex-end",
  gap: theme.spacing(1),
  padding: theme.spacing(1, 3, 3),
  "& .MuiButton-root": {
    minHeight: $isMobile ? 48 : 40,
  },
}));
