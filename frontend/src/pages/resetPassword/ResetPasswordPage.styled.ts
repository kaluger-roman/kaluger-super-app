import { Alert, Box } from "@mui/material";
import { Link } from "react-router-dom";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  padding: theme.spacing(2),
}));

export const InvalidLinkAlert = styled(Alert)`
  width: 100%;
  max-width: 440px;
`;

export const RouterLink = styled(Link)`
  text-decoration: none;
  margin-top: 16px;
`;
