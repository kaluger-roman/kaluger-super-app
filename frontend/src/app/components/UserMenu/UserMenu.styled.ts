import { Logout as LogoutIcon, Person as PersonIcon } from "@mui/icons-material";
import { MenuItem } from "@mui/material";

import { styled } from "@shared";

export const StyledMenuItem = styled(MenuItem)({
  "& .MuiSvgIcon-root": {
    marginRight: "8px",
  },
});

export const StyledPersonIcon = styled(PersonIcon)({
  marginRight: "8px",
});

export const StyledLogoutIcon = styled(LogoutIcon)({
  marginRight: "8px",
});
