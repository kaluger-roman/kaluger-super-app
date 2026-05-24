import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { styled, Box, Typography } from "@mui/material";

export const MonthBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(2),
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  cursor: "pointer",
  boxShadow: theme.shadows[1],
  transition: "all 0.2s ease",
  "&:hover": {
    boxShadow: theme.shadows[2],
    transform: "translateY(-1px)",
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
  },
}));

export const MonthText = styled(Typography)(() => ({
  flex: 1,
  fontWeight: 600,
  color: "white",
  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
}));

export const WhiteExpandMore = styled(ExpandMore)(() => ({
  color: "white",
}));

export const WhiteExpandLess = styled(ExpandLess)(() => ({
  color: "white",
}));
