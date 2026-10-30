import { Alert } from "@mui/material";

import { styled } from "@shared";

export const StyledBanner = styled(Alert)(({ theme }) => ({
  alignItems: "center",
  marginBottom: "24px",
  "& .MuiAlert-action": {
    paddingTop: 0,
  },
  "& .MuiAlert-action .MuiButton-root": {
    whiteSpace: "nowrap",
  },
  [theme.breakpoints.down("sm")]: {
    flexWrap: "wrap",
  },
}));
