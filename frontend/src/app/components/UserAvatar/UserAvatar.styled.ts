import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginLeft: theme.spacing(1),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
  borderRadius: theme.spacing(2),
  backgroundColor: "rgba(255,255,255,0.08)",
  boxShadow: theme.shadows[1],
  gap: theme.spacing(0.5),
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(2),
    gap: theme.spacing(1),
  },
}));

export const AvatarBox = styled(Box)(({ theme }) => ({
  width: 28,
  height: 28,
  borderRadius: "50%",
  backgroundColor: "#42a5f5",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 14,
  textTransform: "uppercase",
  boxShadow: theme.shadows[2],
  marginRight: theme.spacing(0.5),
  letterSpacing: 1,
  userSelect: "none",
  [theme.breakpoints.up("sm")]: {
    width: 32,
    height: 32,
    fontSize: 18,
    marginRight: theme.spacing(1),
  },
}));

export const UserName = styled(Typography)({
  fontWeight: 500,
  color: "white",
  textShadow: "0 1px 4px rgba(66,165,245,0.18)",
  letterSpacing: 0.5,
  maxWidth: 120,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
