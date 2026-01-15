import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { styled, Box, Typography } from "@mui/material";

export const YearBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  borderRadius: theme.spacing(2),
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  boxShadow: theme.shadows[2],
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: theme.shadows[4],
    transform: "translateY(-2px)",
  },
}));

export const YearText = styled(Typography)(() => ({
  fontWeight: 700,
  color: "white",
  textAlign: "center",
  marginRight: 8,
  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
}));

export const WhiteExpandMore = styled(ExpandMore)(() => ({
  color: "white",
}));

export const WhiteExpandLess = styled(ExpandLess)(() => ({
  color: "white",
}));
