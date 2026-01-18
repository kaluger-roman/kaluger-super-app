import { Person as PersonIcon } from "@mui/icons-material";
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
