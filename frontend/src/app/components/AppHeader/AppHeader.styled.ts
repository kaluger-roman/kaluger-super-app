import { AppBar, IconButton, Toolbar, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
}));

export const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: 56,
  [theme.breakpoints.up("sm")]: {
    minHeight: 64,
  },
}));

export const TitleText = styled(Typography)(({ theme }) => ({
  flexGrow: 1,
  fontWeight: 700,
  letterSpacing: 1,
  color: "white",
  textShadow: "0 2px 8px rgba(76, 110, 245, 0.18)",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  userSelect: "none",
  [theme.breakpoints.up("sm")]: {
    letterSpacing: 2,
    gap: theme.spacing(1),
  },
}));

export const EmojiBox = styled("span")(({ theme }) => ({
  fontSize: 24,
  marginRight: theme.spacing(0.5),
  filter: "drop-shadow(0 2px 4px #764ba2aa)",
  [theme.breakpoints.up("sm")]: {
    fontSize: 32,
    marginRight: theme.spacing(1),
  },
}));

export const MenuButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
  [theme.breakpoints.up("sm")]: {
    marginRight: theme.spacing(2),
  },
}));
