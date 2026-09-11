import { MenuItem } from "@mui/material";

import { styled } from "@shared";

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
