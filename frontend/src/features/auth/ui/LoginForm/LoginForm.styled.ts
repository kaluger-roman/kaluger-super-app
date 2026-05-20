import { Box, Paper, ToggleButtonGroup, Typography } from "@mui/material";
import { Link } from "react-router-dom";

import { styled } from "@shared";

export const FormPaper = styled(Paper)<{ $isMobile: boolean }>`
  padding: ${({ $isMobile }) => ($isMobile ? "24px" : "32px")};
  width: 100%;
  max-width: 440px;
  border-radius: 24px;
  max-height: ${({ $isMobile }) => ($isMobile ? "90vh" : "auto")};
  overflow: auto;
`;

export const HeaderBox = styled(Box)<{ $isMobile: boolean }>`
  text-align: center;
  margin-bottom: ${({ $isMobile }) => ($isMobile ? "16px" : "24px")};
`;

export const EmojiTypography = styled(Typography)<{ component?: React.ElementType }>`
  font-weight: 700;
  color: ${({ theme }) => theme.palette.primary.main};
`;

export const TitleTypography = styled(Typography)<{ component?: React.ElementType }>`
  font-weight: 600;
`;

export const RoleToggleGroup = styled(ToggleButtonGroup)`
  margin-bottom: 16px;
`;

export const ForgotPasswordRow = styled(Box)`
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
`;

export const ForgotPasswordLink = styled(Link)`
  color: ${({ theme }) => theme.palette.primary.main};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;
