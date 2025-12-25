import { Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)({
  display: "flex",
  minHeight: "100vh",
});

export const MainContent = styled(Box)<{ $isLoggedIn: boolean; component?: React.ElementType }>(
  ({ theme, $isLoggedIn }) => ({
    flexGrow: 1,
    width: "100%",
    marginTop: $isLoggedIn ? theme.spacing(7) : 0,
    [theme.breakpoints.up("sm")]: {
      marginTop: $isLoggedIn ? theme.spacing(8) : 0,
    },
  })
);
