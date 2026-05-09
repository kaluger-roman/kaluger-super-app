import { Box, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";

import { styled } from "@shared";

export const FormPaper = styled(Paper)<{ $isMobile: boolean }>`
  padding: ${({ $isMobile }) => ($isMobile ? "24px" : "32px")};
  width: 100%;
  max-width: 440px;
  border-radius: 24px;
`;

export const RouterLink = styled(Link)`
  text-decoration: none;
  width: 100%;
`;

export const HeaderBox = styled(Box)<{ $isMobile: boolean }>`
  text-align: center;
  margin-bottom: ${({ $isMobile }) => ($isMobile ? "16px" : "24px")};
`;

export const TitleTypography = styled(Typography)<{ component?: React.ElementType }>`
  font-weight: 600;
`;

export const ActionsBox = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
`;

export const StatusBox = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
  padding: 16px 0;
`;
