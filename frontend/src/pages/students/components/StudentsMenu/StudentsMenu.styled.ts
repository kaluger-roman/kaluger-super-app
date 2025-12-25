import { MenuItem, styled } from "@mui/material";

export const StyledMenuItem = styled(MenuItem)({
  "& .MuiSvgIcon-root": {
    marginRight: "8px",
  },
});

export const StyledDeleteMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.error.main,
  "& .MuiSvgIcon-root": {
    marginRight: "8px",
  },
}));
