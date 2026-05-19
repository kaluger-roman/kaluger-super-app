import { AppBar, Box, IconButton, Toolbar, styled } from "@mui/material";

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

export const MenuButton = styled(IconButton)({
  color: "inherit",
});

export const ContentBox = styled(Box)({
  flex: 1,
  padding: "16px",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
});
