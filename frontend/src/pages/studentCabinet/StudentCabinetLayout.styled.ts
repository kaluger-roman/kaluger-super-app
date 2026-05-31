import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";

import { styled } from "@shared";

export const RootBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
});

export const StyledAppBar = styled(AppBar)({
  position: "sticky",
  top: 0,
});

export const StyledToolbar = styled(Toolbar)({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const HeaderTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  fontWeight: 600,
}));

export const MenuButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
}));

export const ContentBox = styled(Box)({
  flex: 1,
  padding: "16px",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
});
