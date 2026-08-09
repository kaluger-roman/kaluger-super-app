import {
  Drawer,
  Toolbar,
  Typography,
  Box,
  Avatar,
  ListItemButton,
  ListItemIcon,
} from "@mui/material";

import { styled } from "@shared";

export const StyledDrawer = styled(Drawer)<{ $drawerWidth: number }>(({ $drawerWidth }) => ({
  width: $drawerWidth,
  flexShrink: 0,
  "& .MuiDrawer-paper": {
    width: $drawerWidth,
    boxSizing: "border-box",
  },
}));

export const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: 56,
  [theme.breakpoints.up("sm")]: {
    minHeight: 64,
  },
}));

export const StyledTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.primary.main,
  fontSize: "1.1rem",
  [theme.breakpoints.up("sm")]: {
    fontSize: "1.25rem",
  },
})) as typeof Typography;

export const ContentBox = styled(Box)({
  overflow: "auto",
  flex: 1,
});

export const UserSection = styled(Box)({
  padding: "16px",
});

export const UserInfoBox = styled(Box)({
  display: "flex",
  alignItems: "center",
  marginBottom: "16px",
  gap: "16px",
});

export const StyledAvatar = styled(Avatar)(({ theme }) => ({
  bgcolor: theme.palette.primary.main,
  width: 36,
  height: 36,
  fontSize: "0.875rem",
  [theme.breakpoints.up("sm")]: {
    width: 40,
    height: 40,
    fontSize: "1rem",
  },
}));

export const UserDetailsBox = styled(Box)({
  minWidth: 0,
  flex: 1,
});

export const UserName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "0.875rem",
  [theme.breakpoints.up("sm")]: {
    fontSize: "1rem",
  },
}));

export const UserEmail = styled(Typography)(({ theme }) => ({
  fontSize: "0.75rem",
  [theme.breakpoints.up("sm")]: {
    fontSize: "0.875rem",
  },
}));

export const LogoutButton = styled(ListItemButton)({
  margin: 0,
  paddingLeft: "8px",
  paddingRight: "8px",
  "&:hover": {
    color: "error.contrastText",
  },
});

export const LogoutIcon = styled(ListItemIcon)({
  minWidth: 36,
});
