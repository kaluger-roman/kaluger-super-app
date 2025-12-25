import { Box, Paper, Typography } from "@mui/material";

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
